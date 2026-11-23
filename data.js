(function () {
  'use strict';

  const config = {
    brand: 'AFTERFORM', locale: 'en-US', currency: 'USD', market: 'United States',
    hero: './assets/hero.webp', shippingFree: 150, shippingStandard: 9, shippingExpress: 18,
    categories: ['Outerwear', 'Tops', 'Bottoms', 'Accessories'],
    demoEmail: 'demo@afterform.test', demoPassword: 'Afterform123'
  };

  const looks = [
    { id: 'the-long-way', name: 'The Long Way', line: 'Leather, rib cotton, and a line that keeps moving.', image: './assets/look-1.webp', alt: 'A woman in a leather bomber and wide-leg trousers against an amber backdrop', items: ['drift-bomber', 'frame-trouser', 'second-skin-tank'] },
    { id: 'off-the-clock', name: 'Off the Clock', line: 'Washed tones and a little extra room.', image: './assets/look-2.webp', alt: 'A man wearing washed blue separates in a steel-blue studio', items: ['static-crew', 'wide-hour-denim'] },
    { id: 'after-hours', name: 'After Hours', line: 'A white tank, dark leather, and a flash of silver.', image: './assets/look-3.webp', alt: 'A woman with a crescent shoulder bag against a deep red backdrop', items: ['crescent-bag', 'dome-studs', 'second-skin-tank'] }
  ];

  const starterCatalog = [
    { id: 'drift-bomber', name: 'Drift Bomber', category: 'Outerwear', price: 248, color: 'Dark Chocolate', hex: '#47322b', sizes: ['XS','S','M','L','XL'], qty: [3,9,12,7,0], description: 'A sculptural bomber with room through the body, a low shoulder, and a clean collar. Soft grain gives it a little more character every time you wear it.', details: ['Supple leather outer; fully lined', 'Two welt pockets and an internal pocket', 'Oversized fit. Size down for a closer fit.', 'Specialist leather clean only.'], look: 0, isNew: true },
    { id: 'frame-trouser', name: 'Frame Trouser', category: 'Bottoms', price: 118, color: 'Shadow', hex: '#252625', sizes: ['XS','S','M','L','XL'], qty: [6,11,8,3,0], description: 'A clean, generous leg with a single front pleat. The heavyweight twill falls straight from the hip and holds its shape from morning to late.', details: ['Heavyweight cotton twill', 'Single pleat with a straight, wide leg', 'True to size with a mid-rise waist', 'Machine wash cold.'], look: 0, isNew: true },
    { id: 'second-skin-tank', name: 'Second Skin Tank', category: 'Tops', price: 42, color: 'Chalk', hex: '#e1dac6', sizes: ['XS','S','M','L','XL'], qty: [7,15,21,12,4], description: 'A close-fitting rib tank with a high front neckline and slightly wider straps. Cut from substantial cotton that layers well and wears equally well on its own.', details: ['95% organic cotton, 5% elastane', 'Compact rib with bound neck and armholes', 'Close fit with stretch', 'Machine wash cold and lay flat.'], look: 2, isNew: true },
    { id: 'crescent-bag', name: 'Crescent Bag', category: 'Accessories', price: 135, color: 'Oxblood', hex: '#672838', sizes: ['One size'], qty: [9], description: 'A soft crescent for what you carry every day. The curved body tucks under the arm and the adjustable strap sits comfortably over heavier layers.', details: ['Smooth leather with cotton lining', 'Zip closure and interior slip pocket', '11.8 in × 7.5 in × 2.7 in', 'Wipe with a soft, dry cloth.'], look: 2, isNew: true },
    { id: 'loop-shades', name: 'Loop Shades', category: 'Accessories', price: 78, color: 'Black', hex: '#1d1d1b', sizes: ['One size'], qty: [4], description: 'A gently wrapped frame with a narrow, ' + 'low-profile lens. The gloss finish catches the light along the temples.', details: ['Acetate frame and tinted UV400 lenses', 'Includes protective pouch', 'Wipe with the included microfiber cloth.'], isNew: false },
    { id: 'static-crew', name: 'Static Crew', category: 'Tops', price: 85, oldPrice: 104, color: 'Washed Slate', hex: '#627787', sizes: ['XS','S','M','L','XL'], qty: [4,5,8,3,2], description: 'A boxy crewneck with a sun-faded wash, a dry cotton hand, and slightly dropped shoulders.', details: ['Heavyweight fleece-backed cotton', 'Wide rib trim and boxy fit', 'Wash separately for the first wash.'], look: 1, isNew: false },
    { id: 'wide-hour-denim', name: 'Wide Hour Denim', category: 'Bottoms', price: 110, color: 'Dark Rinse', hex: '#344451', sizes: ['XS','S','M','L','XL'], qty: [0,5,7,3,3], description: 'Dark-rinse denim with a long, wide leg and warm contrast stitching. It softens with wear while keeping its shape.', details: ['100% rigid cotton denim', 'Five-pocket construction', 'High rise with a relaxed wide leg', 'Wash inside out in cold water.'], look: 1, isNew: false },
    { id: 'dome-studs', name: 'Dome Studs', category: 'Accessories', price: 54, color: 'Brushed Silver', hex: '#b4b5b0', sizes: ['One size'], qty: [3], description: 'Rounded brushed-metal studs with a sculptural profile and a soft, matte finish.', details: ['Recycled brass with sterling silver plating', 'Post back; sold as a pair', 'Polish gently with a clean cloth.'], look: 2, isNew: false }
  ].map(({color, hex, qty, look, ...product}, index) => {
    const image = './assets/product-' + (index + 1) + '.webp';
    const gallery = [{image, alt: product.name + ' in ' + color}];
    if (looks[look]) gallery.push({image: looks[look].image, alt: looks[look].alt});
    gallery.push({image, alt: 'Close-up of ' + product.name, detail: true});
    return {...product, image, alt: gallery[0].alt, gallery, colors: [{name: color, hex}], stock: Object.fromEntries(product.sizes.map((size, i) => [size, qty[i]])), featured: index < 4};
  });

  const paths = {
    search:'<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4 4"/>',
    user:'<circle cx="12" cy="8" r="3.25"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/>',
    heart:'<path d="M20.8 9c0 4-8.8 9.6-8.8 9.6S3.2 13 3.2 9A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 8.8 1Z"/>',
    bag:'<path d="M5 8h14l1.2 12H3.8L5 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>', plus:'<path d="M5 12h14M12 5v14"/>', minus:'<path d="M5 12h14"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', left:'<path d="m14 5-7 7 7 7"/>', right:'<path d="m10 5 7 7-7 7"/>', up:'<path d="m5 15 7-7 7 7"/>', down:'<path d="m5 9 7 7 7-7"/>',
    filter:'<path d="M4 7h8m4 0h4M4 17h4m4 0h8M12 4v6M8 14v6"/>', check:'<path d="m5 12 4.5 4.5L19 7"/>',
    truck:'<path d="M2 5h12v12H2zM14 8h4l4 5v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    lock:'<rect x="5" y="10" width="14" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m4 6 8 7 8-7"/>', globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    expand:'<path d="M4 10V4h6m4 0h6v6m0 4v6h-6M4 14v6h6"/>', eye:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10"/>',grid:'<path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>',
    spark:'<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>',external:'<path d="M13 4h7v7m0-7-9 9m7 0v7H4V6h7"/>'
  };

  const memory = new Map();
  let storeId = 'afterform';
  let remoteCatalog = null;
  const source = {mode: 'dummy', storeId, reason: 'API not configured'};
  const keyFor = key => storeId === 'afterform' ? 'afterform-v1:' + key : 'afterform-v2:' + storeId + ':' + key;
  function setStore(id) {
    storeId = id;
    source.storeId = id;
    config.storeId = id;
  }
  function setRemoteStore({store, products, remoteLooks, home}) {
    Object.assign(config, store);
    config.storeId = storeId;
    config.slides = home.slides;
    config.journal = home.journal;
    remoteCatalog = products;
    looks.splice(0, looks.length, ...remoteLooks);
    source.mode = 'api';
    source.reason = null;
  }
  function read(key, fallback) {
    try {
      const value = localStorage.getItem(keyFor(key));
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return memory.get(key) ?? fallback;
    }
  }
  function write(key, value) {
    try { localStorage.setItem(keyFor(key), JSON.stringify(value)); }
    catch { memory.set(key, value); }
    return value;
  }
  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function icon(name, size = 20) {
    return `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.box}</svg>`;
  }
  let formatterKey = '';
  let formatter;
  function money(value) {
    const key = config.locale + ':' + config.currency;
    if (key !== formatterKey) {
      formatter = new Intl.NumberFormat(config.locale, {style: 'currency', currency: config.currency});
      formatterKey = key;
    }
    return formatter.format(Number(value) || 0);
  }
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const catalog = () => remoteCatalog === null ? read('catalog', starterCatalog) : remoteCatalog;
  // TODO(afterform-be): remote catalog edits are an in-memory preview until authenticated write APIs exist.
  const setCatalog = items => remoteCatalog === null ? write('catalog', items) : (remoteCatalog = items);
  const cart = () => read('cart', []);
  const setCart = lines => write('cart', lines);
  function getOrders() {
    const existing = read('orders', null);
    if (existing) return existing;
    return write('orders', source.mode === 'api' ? [] : window.AFSeed ? window.AFSeed(starterCatalog) : []);
  }
  const setOrders = value => write('orders', value);

  function cartItems(lines = cart(), products = catalog()) {
    return lines.map(line => {
      const product = products.find(item => item.id === line.id && !item.archived && !item.hidden && !['draft','archived'].includes(String(item.status).toLowerCase()));
      if (!product) return {...line, name: 'Unavailable item', price: 0, stock: 0};
      return {...line, name: product.name, price: product.price, image: product.image, stock: Number(product.stock?.[line.size]) || 0};
    });
  }
  function updateCart(id, size, color, qty) {
    const lines = cart();
    const match = line => line.id === id && line.size === size && line.color === color;
    const withoutLine = lines.filter(line => !match(line));
    if (qty <= 0) {
      setCart(withoutLine);
      return {ok: true};
    }
    const [item] = cartItems([{id, size, color, qty}]);
    const alreadyReserved = withoutLine.filter(line => line.id === id && line.size === size).reduce((sum, line) => sum + line.qty, 0);
    if (!Number.isInteger(qty) || qty + alreadyReserved > item.stock) return {ok: false, error: 'That quantity is unavailable for this size.'};
    const previous = lines.findIndex(match);
    if (previous < 0) lines.push({id, size, color, qty});
    else lines[previous] = {id, size, color, qty};
    setCart(lines);
    return {ok: true};
  }
  function addCart(id, size, color, qty = 1) {
    const line = cart().find(item => item.id === id && item.size === size && item.color === color);
    return updateCart(id, size, color, (line?.qty ?? 0) + qty);
  }
  function coupon(code) {
    const discounts = read('discounts', [{code:'AFTER10',type:'percent',value:10,active:true}]);
    return discounts.find(discount => discount.active && discount.code.toUpperCase() === String(code ?? '').trim().toUpperCase()) ?? null;
  }
  function totals(items = cartItems(), code = '', method = 'standard') {
    const subtotal = cents(items.reduce((sum, item) => sum + item.price * item.qty, 0));
    const offer = coupon(code);
    const discount = offer ? cents(Math.min(subtotal, Math.max(0, offer.type === 'percent' ? subtotal * offer.value / 100 : offer.value))) : 0;
    const shipping = items.length === 0 ? 0 : method === 'express' ? config.shippingExpress : subtotal >= config.shippingFree ? 0 : config.shippingStandard;
    return {subtotal, discount, shipping, total: cents(subtotal - discount + shipping)};
  }
  function placeOrder({contact, address, method, code}) {
    if (source.mode === 'api') return {ok:false, error:'Checkout is not enabled for API-backed stores until a secure backend order endpoint is available.'};
    const lines = cart();
    const products = catalog();
    const items = cartItems(lines, products);
    if (!items.length) return {ok: false, error: 'Your bag is empty.'};
    const orderQuantity = new Map();
    for (const item of items) {
      const key = JSON.stringify([item.id, item.size]);
      const count = (orderQuantity.get(key) ?? 0) + item.qty;
      if (count > item.stock) return {ok: false, error: `${item.name} has limited stock. Update your bag to continue.`};
      orderQuantity.set(key, count);
    }
    const orders = getOrders();
    const number = Math.max(1030, ...orders.map(order => Number(String(order.id).replace(/^\D+/, '')) || 0)) + 1;
    const order = {id: `AF-${number}`, date: new Date().toISOString(), customer: contact.name, email: contact.email.trim().toLowerCase(), address, method, currency: config.currency, status: 'Open', payment: 'Paid', fulfillment: 'Unfulfilled', items, ...totals(items, code, method)};
    setCatalog(products.map(product => {
      if (!items.some(item => item.id === product.id)) return product;
      const stock = Object.fromEntries(Object.entries(product.stock).map(([size, count]) => [size, Number(count) - (orderQuantity.get(JSON.stringify([product.id, size])) ?? 0)]));
      return {...product, stock};
    }));
    setOrders([order, ...orders]);
    setCart([]);
    return {ok: true, order};
  }

  const getSession = () => read('session', null);
  const signOut = () => write('session', null);
  async function demoCredential(password) {
    if (!globalThis.crypto?.subtle) return null;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function signIn(email, password) {
    if (source.mode === 'api') return {ok:false, error:'Accounts are not enabled for API-backed stores yet.'};
    const normalized = email.trim().toLowerCase();
    const isDemo = normalized === config.demoEmail && password === config.demoPassword;
    const profile = read('profiles', []).find(item => item.email === normalized);
    const credential = profile ? await demoCredential(password) : null;
    if (!isDemo && (!credential || credential !== profile?.credential)) return {ok: false, error: 'That email and password do not match.'};
    const session = {name: isDemo ? 'Alex Morgan' : profile.name, email: normalized};
    write('session', session);
    return {ok: true, session};
  }
  async function register({name, email, password}) {
    if (source.mode === 'api') return {ok:false, error:'Accounts are not enabled for API-backed stores yet.'};
    const normalized = email.trim().toLowerCase();
    const profiles = read('profiles', []);
    if (normalized === config.demoEmail || profiles.some(item => item.email === normalized)) return {ok: false, error: 'An account with this email already exists.'};
    const credential = await demoCredential(password);
    if (!credential) return {ok: false, error: 'Open the prototype in a browser with Web Crypto to create a demo account.'};
    const session = {name: name.trim(), email: normalized};
    write('profiles', [...profiles, {...session, credential}]);
    write('session', session);
    return {ok: true, session};
  }

  window.AF = {config, looks, source, setStore, setRemoteStore, read, write, esc, icon, money, catalog, setCatalog, cart, setCart, addCart, updateCart, cartItems, coupon, totals, getOrders, setOrders, placeOrder, getSession, signIn, register, signOut};
}());
