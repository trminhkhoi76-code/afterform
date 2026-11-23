const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function storage() {
  const entries = new Map();
  return {
    entries,
    getItem: key => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, String(value))
  };
}

async function boot({search = '', apiBaseUrl = '', response, fetchError} = {}) {
  const localStorage = storage();
  const document = {
    documentElement: {
      style: {
        tokens: {},
        setProperty(key, value) { this.tokens[key] = value; }
      }
    }
  };
  const window = {
    location: {search},
    AF_RUNTIME: {apiBaseUrl, defaultStore: 'afterform', timeoutMs: 1000}
  };
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({url, init});
    if (fetchError) throw fetchError;
    return response || {ok: false, status: 503};
  };
  const context = vm.createContext({
    window, document, localStorage, fetch, URL, URLSearchParams, Intl, AbortController,
    setTimeout, clearTimeout, console: {warn() {}}
  });
  vm.runInContext(read('data.js'), context, {filename: 'data.js'});
  vm.runInContext(read('store-loader.js'), context, {filename: 'store-loader.js'});
  await window.AF.ready;
  return {window, localStorage, document, requests};
}

const beautyResponse = {
  store: {
    slug: 'beauty', name: 'Beauty Store',
    locale: 'vi-VN', currency: 'VND', categories: ['Skincare'],
    optionKey: 'volume', productOptionLabel: 'Dung tích',
    theme: {primaryColor: '#aabbcc'}
  },
  products: [{
    id: 'serum-001', name: 'Hydrating Serum', category: 'Skincare',
    price: 350000, featured: true, image: 'https://example.com/serum.png',
    variants: [{sku: 'S30', options: {volume: '30ml'}, stock: 15}]
  }],
  home: {slides: []},
  looks: []
};

test('unconfigured backend preserves the original fashion demo without fetching', async () => {
  const {window, requests} = await boot();
  assert.equal(window.AF.source.mode, 'dummy');
  assert.equal(window.AF.catalog().length, 8);
  assert.equal(window.AF.config.brand, 'AFTERFORM');
  assert.equal(requests.length, 0);
});

test('successful bootstrap hydrates a separate store and maps its product option axis', async () => {
  const {window, requests, document} = await boot({
    search: '?store=beauty', apiBaseUrl: 'https://example.com/',
    response: {ok: true, json: async () => beautyResponse}
  });
  assert.equal(window.AF.source.mode, 'api');
  assert.equal(window.AF.source.storeId, 'beauty');
  assert.equal(window.AF.config.brand, 'Beauty Store');
  assert.equal(window.AF.config.currency, 'VND');
  assert.equal(window.AF.catalog().length, 1);
  assert.equal(window.AF.catalog()[0].sizes[0], '30ml');
  assert.equal(window.AF.catalog()[0].optionLabel, 'Dung tích');
  assert.equal(window.AF.catalog()[0].stock['30ml'], 15);
  assert.equal(document.documentElement.style.tokens['--lime'], '#aabbcc');
  assert.equal(requests[0].url, 'https://example.com/api/v1/public/stores/beauty/bootstrap');
  assert.equal(requests[0].init.credentials, 'omit');
  assert.equal(window.AF.placeOrder({}).ok, false);
});

test('valid empty catalog stays empty instead of silently showing fashion products', async () => {
  const {window} = await boot({
    search: '?store=beauty', apiBaseUrl: 'https://example.com',
    response: {ok: true, json: async () => ({store: {slug: 'beauty', name: 'Beauty Store'}, products: []})}
  });
  assert.equal(window.AF.source.mode, 'api');
  assert.equal(window.AF.catalog().length, 0);
});

test('catalog gallery supports HTTPS videos with optional posters and preserves still images', async () => {
  const payload = structuredClone(beautyResponse);
  payload.products[0].gallery = [
    {image: 'https://example.com/still.webp', alt: 'Still'},
    {video: 'https://example.com/clip.mp4', alt: 'Clip'},
    {video: 'https://example.com/studio.webm', image: 'https://example.com/preview.webp'},
    {video: 'javascript:alert(1)'}
  ];
  const {window} = await boot({
    search: '?store=beauty', apiBaseUrl: 'https://example.com',
    response: {ok: true, json: async () => payload}
  });
  const gallery = window.AF.catalog()[0].gallery;
  assert.equal(gallery.length, 3);
  assert.equal(gallery[0].image, 'https://example.com/still.webp');
  assert.equal(gallery[1].video, 'https://example.com/clip.mp4');
  assert.equal(gallery[1].image, '');
  assert.equal(gallery[2].image, 'https://example.com/preview.webp');
});

test('wrong store identity rejects the entire response', async () => {
  const {window} = await boot({
    search: '?store=beauty', apiBaseUrl: 'https://example.com',
    response: {ok: true, json: async () => ({store: {slug: 'fashion', name: 'Wrong Store'}, products: []})}
  });
  assert.equal(window.AF.source.mode, 'dummy');
  assert.equal(window.AF.catalog().length, 8);
});

test('network failure, server errors and invalid products fall back safely', async () => {
  const cases = [
    {fetchError: new Error('network offline')},
    {response: {ok: false, status: 503}},
    {response: {ok: true, json: async () => ({store: {slug: 'beauty', name: 'Beauty'}, products: [{name: 'broken', price: -1}]})}}
  ];
  for (const scenario of cases) {
    const {window} = await boot({search: '?store=beauty', apiBaseUrl: 'https://example.com', ...scenario});
    assert.equal(window.AF.source.mode, 'dummy');
    assert.equal(window.AF.catalog().length, 8);
  }
});

test('browser-local demo data is namespaced for other store slugs', async () => {
  const {window, localStorage} = await boot({search: '?store=beauty'});
  window.AF.write('saved', ['abc']);
  assert.ok(localStorage.entries.has('afterform-v2:beauty:saved'));
  assert.ok(!localStorage.entries.has('afterform-v1:saved'));
});

test('legacy dummy checkout remains functional', async () => {
  const {window} = await boot();
  const AF = window.AF;
  const first = AF.catalog()[0];
  assert.equal(AF.addCart(first.id, first.sizes[0], first.colors[0].name, 1).ok, true);
  const placed = AF.placeOrder({
    contact: {name: 'Demo Customer', email: 'demo@example.test'},
    address: {street: '123 Example', city: 'Demo', state: 'CA', zip: '94000', country: 'United States'},
    method: 'standard', code: ''
  });
  assert.equal(placed.ok, true);
  assert.equal(AF.getOrders().length, 1);
  assert.equal(AF.cart().length, 0);
});
