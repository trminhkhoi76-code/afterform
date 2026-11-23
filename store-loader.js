(function () {
  'use strict';

  const AF = window.AF;
  const runtime = window.AF_RUNTIME || {};
  const requested = new URLSearchParams(window.location.search).get('store') || runtime.defaultStore || 'afterform';
  const storeId = /^[a-z0-9][a-z0-9-]{0,62}$/.test(requested) ? requested : 'afterform';
  const apiBase = String(runtime.apiBaseUrl || '').trim().replace(/\/+$/, '');
  const timeoutMs = Math.min(15000, Math.max(1000, Number(runtime.timeoutMs) || 4000));
  AF.setStore(storeId);

  const string = (value, fallback = '') => typeof value === 'string' ? value : fallback;
  const list = value => Array.isArray(value) ? value : [];
  const validColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  const unique = values => [...new Set(values)];

  function videoUrl(value) {
    if (typeof value !== 'string' || !value) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch {
      return '';
    }
  }

  function normalizeProduct(product, store) {
    if (!product || typeof product !== 'object' || !String(product.id || '').trim() ||
        !String(product.name || '').trim() || !Number.isFinite(Number(product.price)) || Number(product.price) < 0) {
      throw new Error('Invalid product in API response');
    }
    // Phase 1: the existing storefront selects one variant axis. Multi-axis variants are a BE/UI TODO.
    const variants = list(product.variants);
    const optionKey = string(product.optionKey, string(store.optionKey, 'size'));
    const sizes = variants.length
      ? unique(variants.map(variant => String(variant.options?.[optionKey] ?? variant.name ?? 'One size')))
      : list(product.sizes).map(String);
    if (!sizes.length) sizes.push('One size');
    const stock = variants.length
      ? Object.fromEntries(variants.map(variant => [String(variant.options?.[optionKey] ?? variant.name ?? 'One size'), Math.max(0, Number(variant.stock) || 0)]))
      : Object.fromEntries(sizes.map(size => [size, Math.max(0, Number(product.stock?.[size]) || 0)]));
    const image = string(product.image);
    const gallery = list(product.gallery).flatMap(entry => {
      if (!entry || typeof entry !== 'object') return [];
      const video = videoUrl(entry.video);
      if (video) return [{...entry, video, image: string(entry.image), alt: string(entry.alt, product.name)}];
      if (typeof entry.image !== 'string') return [];
      return [{...entry, video: '', alt: string(entry.alt, product.name)}];
    });
    if (!gallery.length && image) gallery.push({image, alt: string(product.alt, product.name)});
    return {
      ...product,
      id: String(product.id),
      name: String(product.name),
      category: string(product.category, 'Other'),
      price: Number(product.price),
      oldPrice: Number(product.oldPrice) || 0,
      description: string(product.description),
      details: list(product.details).map(String),
      image,
      alt: string(product.alt, product.name),
      gallery,
      colors: list(product.colors).filter(value => value && typeof value.name === 'string'),
      sizes,
      stock,
      optionLabel: string(product.optionLabel, string(store.productOptionLabel, 'Size')),
      isNew: product.isNew === true,
      featured: product.featured === true
    };
  }

  function normalize(payload) {
    if (!payload || typeof payload !== 'object' || !payload.store || !Array.isArray(payload.products)) {
      throw new Error('Missing store or products in API response');
    }
    const rawStore = payload.store;
    if (rawStore.slug !== storeId || !String(rawStore.name || '').trim()) {
      throw new Error('Store identity mismatch in API response');
    }
    const products = payload.products.map(item => normalizeProduct(item, rawStore));
    if (unique(products.map(item => item.id)).length !== products.length) {
      throw new Error('Duplicate product IDs in API response');
    }
    const locale = string(rawStore.locale, 'en-US');
    const currency = string(rawStore.currency, 'USD');
    // Reject invalid locales/currencies instead of breaking all currency renderers.
    new Intl.NumberFormat(locale, {style: 'currency', currency});
    const home = payload.home && typeof payload.home === 'object' ? payload.home : {};
    const hero = string(rawStore.hero, products[0]?.image || '');
    const slides = list(home.slides).map(slide => ({
      tag: string(slide.tag, 'Discover'),
      first: string(slide.first, 'Explore'),
      second: string(slide.second, rawStore.name),
      description: string(slide.description, rawStore.description || ''),
      action: string(slide.action, 'Shop now'),
      href: /^#\//.test(slide.href || '') ? slide.href : '#/shop',
      image: string(slide.image, hero),
      alt: string(slide.alt, rawStore.name),
      credit: string(slide.credit),
      product: string(slide.product)
    }));
    if (!slides.length) slides.push({
      tag: 'Discover', first: 'Explore', second: rawStore.name,
      description: string(rawStore.description), action: 'Shop now', href: '#/shop',
      image: hero, alt: rawStore.name, credit: '', product: ''
    });
    return {
      store: {
        brand: rawStore.name, locale, currency,
        market: string(rawStore.market, ''),
        description: string(rawStore.description, rawStore.name),
        hero,
        categories: list(rawStore.categories).length
          ? unique(rawStore.categories.filter(value => typeof value === 'string' && value.trim()))
          : unique(products.map(item => item.category)),
        navigation: list(rawStore.navigation).filter(item => item && typeof item.label === 'string' && /^#\//.test(item.href || '')),
        shippingFree: Math.max(0, Number(rawStore.shipping?.freeAbove) || 0),
        shippingStandard: Math.max(0, Number(rawStore.shipping?.standard) || 0),
        shippingExpress: Math.max(0, Number(rawStore.shipping?.express) || 0),
        productOptionLabel: string(rawStore.productOptionLabel, 'Size'),
        theme: rawStore.theme && typeof rawStore.theme === 'object' ? rawStore.theme : {}
      },
      products,
      remoteLooks: list(payload.looks).filter(look => look && typeof look.id === 'string')
        .map(look => ({...look, items: list(look.items)})),
      home: {slides, journal: home.journal || null}
    };
  }

  function setTheme(theme) {
    const tokens = {
      primaryColor: '--lime',
      backgroundColor: '--paper',
      textColor: '--ink'
    };
    for (const [key, variable] of Object.entries(tokens)) {
      if (validColor(theme[key])) document.documentElement.style.setProperty(variable, theme[key]);
    }
  }

  async function load() {
    if (!apiBase) {
      AF.source.reason = 'Backend URL is not configured';
      return AF.source;
    }
    // CORS must allow the deployed storefront origin. No tokens are sent from public pages.
    if (!/^https?:\/\//i.test(apiBase)) {
      AF.source.reason = 'Backend URL must be absolute';
      return AF.source;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(apiBase + '/api/v1/public/stores/' + encodeURIComponent(storeId) + '/bootstrap', {
        method: 'GET', mode: 'cors', headers: {Accept: 'application/json'},
        credentials: 'omit', signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const normalized = normalize(await response.json());
      AF.setRemoteStore(normalized);
      setTheme(normalized.store.theme);
    } catch (error) {
      AF.source.reason = error?.name === 'AbortError' ? 'Backend request timed out' : 'Backend unavailable or invalid response';
      console.warn('[AFTERFORM] Using demo fallback for store ' + storeId + ': ' + AF.source.reason);
    } finally {
      clearTimeout(timer);
    }
    return AF.source;
  }

  AF.ready = load();
}());
