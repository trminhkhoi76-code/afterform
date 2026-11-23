(async function () {
  'use strict';
  await window.AF.ready;

  const {esc, icon, money, config} = AF;
  const main = document.querySelector('#main');
  const header = document.querySelector('#site-header');
  const footer = document.querySelector('#site-footer');
  const dialog = document.querySelector('#overlay');
  const notification = document.querySelector('#notification');
  const slug = label => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const categoryPath = category => `#/category/${slug(category)}`;
  const productPath = id => `#/product/${encodeURIComponent(id)}`;
  const available = () => AF.catalog().filter(product => !product.archived && !product.hidden && !['draft','archived'].includes(String(product.status).toLowerCase()));
  const categoryNames = () => [...new Map([...config.categories,...available().map(product=>product.category)].filter(Boolean).map(category=>[slug(category),category])).values()];
  const saved = () => AF.read('saved', []);
  const label = title => `<span class="label">${esc(title)}</span>`;
  const empty = (title, description, href = '#/shop', action = 'Explore the shop') => `<div class="empty-state"><h2>${esc(title)}</h2><p>${esc(description)}</p><a class="button primary" href="${href}">${action}</a></div>`;
  const navLinks = AF.source.mode === 'api'
    ? (config.navigation.length
      ? config.navigation.map(item => [item.label, item.href])
      : [['Shop', '#/shop'], ...config.categories.slice(0, 2).map(category => [category, categoryPath(category)]),
        ...(AF.looks.length ? [['Lookbook', '#/gallery']] : [])])
    : [['New in','#/collection/new'],['Shop','#/shop'],['Accessories','#/category/accessories'],['Lookbook','#/gallery']];
  const checkoutPages = new Set(['bag','checkout','confirmation','login','register','account','track']);
  const slides = AF.source.mode === 'api' ? config.slides : [
    {tag:'The Motion Edit', first:'Form in', second:'motion.', description:'Relaxed tailoring, tactile layers, and everyday pieces with a point of view.', action:'Shop the edit', href:'#/collection/new', image:config.hero, alt:'A woman in a chocolate leather bomber seated against a warm amber backdrop', credit:'The Drift Bomber', product:'drift-bomber'},
    {tag:'Studio Notes', first:'After', second:'hours.', description:'A slimmer palette with a softer silhouette. See how the pieces come together.', action:'Open the lookbook', href:'#/gallery/after-hours', image:'./assets/look-3.webp', alt:AF.looks[2].alt, credit:'The Crescent Bag', product:'crescent-bag'}
  ];
  let current;
  let heroIndex = 0;
  let selection = null;
  let dialogKind = '';
  let dialogTrigger = null;
  let toastTimer;

  function routeFromHash() {
    const [path, query] = (location.hash.startsWith('#/') ? location.hash.slice(2) : '').split('?');
    let segments;
    try { segments = path.split('/').filter(Boolean).map(decodeURIComponent); }
    catch { segments = ['missing']; }
    return {page: segments[0] || 'home', parts: segments.slice(1), query: new URLSearchParams(query)};
  }

  function go(path) {
    const href = path.startsWith('#') ? path : '#' + path;
    if (location.hash === href) refresh();
    else location.hash = href;
  }

  function toast(message) {
    clearTimeout(toastTimer);
    notification.textContent = message;
    notification.classList.add('visible');
    toastTimer = setTimeout(() => notification.classList.remove('visible'), 3200);
  }

  function wordmark() {
    return AF.source.mode === 'api'
      ? `<a class="wordmark" href="#/" aria-label="${esc(config.brand)} home">${esc(config.brand)}<i aria-hidden="true"></i></a>`
      : `<a class="wordmark" href="#/" aria-label="AFTERFORM home">AFTER<span>FORM</span><i aria-hidden="true"></i></a>`;
  }

  function renderHeader() {
    const bag = AF.cart().reduce((sum, item) => sum + item.qty, 0);
    const nav = navLinks.map(([title, href]) => `<a href="${esc(href)}"${location.hash.split('?')[0] === href ? ' aria-current="page"' : ''}>${esc(title)}</a>`).join('');
    header.innerHTML = `<div class="shell masthead"><nav class="desktop-navigation" aria-label="Shop navigation">${nav}</nav>
      <button class="icon-button mobile-menu" type="button" data-open="menu" aria-label="Open menu">${icon('menu')}</button>${wordmark()}
      <nav class="utilities" aria-label="Shopping tools"><button class="icon-button" type="button" data-open="search" aria-label="Search">${icon('search')}</button><a class="icon-button account-link" href="${AF.getSession() ? '#/account' : '#/login'}" aria-label="Account">${icon('user')}</a><a class="icon-button saved-link" href="#/saved" aria-label="Saved items">${icon('heart')}</a><button class="icon-button bag-button" type="button" data-open="bag" aria-label="Open shopping bag, ${bag} items">${icon('bag')}<span>${bag}</span></button></nav></div>`;
  }

  function renderFooter() {
    if (AF.source.mode === 'api') {
      footer.innerHTML = `<div class="shell"><div class="footer-top"><div class="footer-intro"><h2>${esc(config.brand)}</h2><p>${esc(config.description)}</p></div><nav aria-label="Explore"><b>Explore</b><a href="#/shop">Shop all</a>${AF.looks.length ? '<a href="#/gallery">Lookbook</a>' : ''}</nav><nav aria-label="Support"><b>Support</b><a href="admin.html?store=${encodeURIComponent(AF.source.storeId)}">Admin preview</a></nav></div><div class="footer-base">${wordmark()}<span>${esc(config.market)} · ${esc(config.currency)}</span><small>© ${new Date().getFullYear()} ${esc(config.brand)}</small></div></div>`;
      return;
    }
    footer.innerHTML = `<div class="shell"><div class="footer-top"><div class="footer-intro">${label('Notes from AFTERFORM')}<h2>Good things<br>come in <em>edits.</em></h2><form id="newsletter" class="newsletter"><label class="sr-only" for="newsletter-email">Email address</label><input id="newsletter-email" type="email" required placeholder="Your email address" autocomplete="email"><button type="submit">Subscribe</button></form><p class="newsletter-status" aria-live="polite"></p></div>
      <nav aria-label="Explore"><b>Explore</b><a href="#/collection/new">New in</a><a href="#/shop">Shop all</a><a href="#/gallery">Lookbook</a><a href="#/saved">Saved items</a></nav>
      <nav aria-label="Support"><b>Support</b><a href="#/track">Track an order</a><a href="#/info/shipping">Delivery & returns</a><a href="#/account">My account</a><a href="admin.html">Admin studio</a></nav></div>
      <div class="footer-base">${wordmark()}<span>United States · USD</span><small>© ${new Date().getFullYear()} AFTERFORM</small></div></div>`;
  }

  function img(path, alt, extra = '') {
    if (!path) return `<div class="image-missing" role="img" aria-label="${esc(alt || 'No image yet')}">${icon('box', 30)}</div>`;
    return `<img src="${esc(path)}" alt="${esc(alt)}" ${extra}>`;
  }

  function swatch(color) {
    const hex = /^#[0-9a-f]{3,8}$/i.test(color?.hex || '') ? color.hex : '#aaa99f';
    return `<i class="swatch" style="--swatch:${hex}" aria-hidden="true"></i>`;
  }

  function saveButton(product, className = '') {
    const isSaved = saved().includes(product.id);
    return `<button class="icon-button save-button ${className}" type="button" data-save="${esc(product.id)}" aria-pressed="${isSaved}" aria-label="Save ${esc(product.name)}">${icon('heart', 19)}</button>`;
  }

  function productCard(product, {showNew = true, eager = false} = {}) {
    const badge = product.oldPrice > product.price ? 'Sale' : showNew && product.isNew ? 'New in' : '';
    const color = product.colors?.[0];
    return `<article class="product-card"><div class="product-plate"><a class="image-link" href="${productPath(product.id)}" aria-label="View ${esc(product.name)}">${img(product.image, product.alt || product.name, eager ? 'decoding="async"' : 'loading="lazy"')}</a>
      ${badge ? `<span class="product-badge ${badge === 'Sale' ? 'sale' : ''}">${badge}</span>` : ''}${saveButton(product)}<button type="button" class="quick-button" data-quick="${esc(product.id)}" aria-label="Quick add ${esc(product.name)}">${icon('plus',18)}</button></div>
      <div class="product-caption"><div><a class="product-name" href="${productPath(product.id)}">${esc(product.name)}</a><p>${color ? swatch(color) + esc(color.name) : esc(product.category)}</p></div><span class="card-price">${product.oldPrice > product.price ? `<s>${money(product.oldPrice)}</s>` : ''}${money(product.price)}</span></div></article>`;
  }

  const grid = (products, options) => `<div class="product-grid">${products.map(product => productCard(product, options)).join('')}</div>`;

  function heroContent() {
    const s = slides[heroIndex];
    return `<div class="hero-copy"><div class="hero-text"><div class="hero-kicker">${label(s.tag)}</div><h1>${esc(s.first)} <em>${esc(s.second)}</em></h1><p>${esc(s.description)}</p>
      <div class="hero-actions"><a class="button primary" href="${esc(s.href)}">${esc(s.action)}</a><div class="hero-pickers" role="group" aria-label="Campaign slides">${slides.map((slide,i) => `<button type="button" data-slide="${i}" aria-label="Show ${esc(slide.tag)}" aria-pressed="${heroIndex === i}"><span></span></button>`).join('')}</div></div></div></div>
      <div class="hero-photo${heroIndex ? ' hero-photo-night' : ''}">${img(s.image, s.alt, 'fetchpriority="high"')}${s.product ? `<a href="${productPath(s.product)}" class="photo-credit"><span>${icon('plus',15)}</span>${esc(s.credit)}</a>` : ''}</div>`;
  }

  function home() {
    const featured = available().filter(product => product.featured);
    const items = (featured.length ? featured : available()).slice(0,4);
    if (AF.source.mode === 'api') {
      return `<section class="shell hero" id="hero" aria-label="Featured collection">${heroContent()}</section>
        <nav class="shell collection-strip" aria-label="Shop by category"><div class="collection-strip-inner"><span>Shop by category</span>${config.categories.map(category => `<a href="${categoryPath(category)}">${esc(category)}</a>`).join('')}</div></nav>
        <section class="shell arrivals"><div class="section-heading"><h2>Featured <em>products.</em></h2><a class="text-link" href="#/shop">View all products</a></div>${items.length ? grid(items,{showNew:false,eager:true}) : empty('No featured products yet.', 'Explore the full catalog.')}</section>
        ${config.journal?.image ? `<section class="shell home-journal"><div class="journal-image">${img(config.journal.image, config.journal.alt || config.brand, 'loading="lazy"')}</div><div class="journal-copy"><h2>${esc(config.journal.title || config.brand)}</h2><p>${esc(config.journal.description || '')}</p><a class="button invert" href="#/shop">Explore products</a></div></section>` : ''}`;
    }
    return `<section class="shell hero" id="hero" aria-label="Featured collection">${heroContent()}</section>
      <nav class="shell collection-strip" aria-label="Shop by category"><div class="collection-strip-inner"><span>Shop by category</span>${config.categories.map(category => `<a href="${categoryPath(category)}">${esc(category)}</a>`).join('')}</div></nav>
      <section class="shell arrivals"><div class="section-heading"><h2>New in <em>studio.</em></h2><a class="text-link" href="#/collection/new">View all new arrivals</a></div>${items.length ? grid(items,{showNew:false,eager:true}) : empty('The next edit is on its way.', 'Browse the full collection in the meantime.')}</section>
      <section class="shell home-journal"><div class="journal-image">${img(AF.looks[1].image, AF.looks[1].alt, 'loading="lazy"')}</div><div class="journal-copy">${label('The Lookbook')}<h2>Put it<br><em>together.</em></h2><p>Three ways to wear the edit, from first light to last call.</p><a class="button invert" href="#/gallery">Explore the looks</a></div></section>`;
  }

  function breadcrumbs(...crumbs) {
    return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">Home</a>${crumbs.map(([name, href]) => `<span>/</span>${href ? `<a href="${href}">${esc(name)}</a>` : `<span aria-current="page">${esc(name)}</span>`}`).join('')}</nav>`;
  }

  function currentLink(route, updates) {
    const params = new URLSearchParams(route.query);
    for (const [key,value] of Object.entries(updates)) {
      if (value) params.set(key,value);
      else params.delete(key);
    }
    const query = params.toString();
    return `#/${[route.page,...route.parts].map(encodeURIComponent).join('/')}${query ? '?' + query : ''}`;
  }

  function catalogPage(route) {
    const categories = categoryNames();
    const category = route.page === 'category' ? categories.find(value => slug(value) === route.parts[0]) : null;
    if ((route.page === 'category' && !category) || (route.page === 'collection' && route.parts[0] !== 'new')) return missing();
    const query = route.query.get('q') || '';
    const isNew = route.page === 'collection';
    const onlySaved = route.page === 'saved';
    const size = route.query.get('size');
    const price = route.query.get('price');
    const stockOnly = route.query.get('stock') === '1';
    const sort = route.query.get('sort') || 'featured';
    const title = query ? 'Search' : onlySaved ? 'Saved pieces' : category || (isNew ? 'New arrivals' : 'Shop all');
    const categoryDescription = ({Outerwear:'Structure, softness, and room to layer.',Tops:'Layers to start with, and some to finish with.',Bottoms:'A longer line and space to move.',Accessories:'Small pieces that change the whole silhouette.'})[category];
    const description = AF.source.mode === 'api'
      ? (query ? `Results for “${query}”` : config.description || 'Explore our catalog.')
      : onlySaved ? 'Keep the pieces you’re thinking about close.' : query ? `Results for “${query}”` : isNew ? 'The latest pieces from the Motion Edit.' : categoryDescription || 'Clothes and accessories for wherever you’re headed.';
    const needle = query.toLowerCase().trim();
    let items = available().filter(item => (!onlySaved || saved().includes(item.id)) && (!category || slug(item.category) === slug(category)) && (!isNew || item.isNew));
    if (needle) items = items.filter(item => [item.name,item.category,item.description,...(item.colors || []).map(color => color.name)].some(value => String(value ?? '').toLowerCase().includes(needle)));
    if (size) items = items.filter(item => Number(item.stock?.[size]) > 0);
    if (price) items = items.filter(item => price.startsWith('over-') ? item.price >= Number(price.slice(5)) : item.price < Number(price));
    if (stockOnly) items = items.filter(item => Object.values(item.stock || {}).some(count => count > 0));
    if (sort === 'low' || sort === 'high') items.sort((a,b) => (a.price - b.price) * (sort === 'low' ? 1 : -1));
    if (sort === 'newest') items.sort((a,b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
    const sortOptions = [['featured','Featured'],['newest','Newest'],['low','Price: low to high'],['high','Price: high to low']];
    const tags = [['size',size],['price',price?.startsWith('over-') ? money(Number(price.slice(5))) + ' and up' : price ? 'Under ' + money(Number(price)) : ''],['stock',stockOnly ? 'In stock' : '']].filter(([,value]) => value);
    return `<section class="shell listing">${breadcrumbs([title])}<div class="page-heading"><h1>${esc(title)}<em>.</em></h1><p>${esc(description)}</p></div>
      ${onlySaved || query ? '' : `<nav class="category-tabs" aria-label="Product categories"><a href="#/shop" ${route.page === 'shop' ? 'aria-current="page"' : ''}>All pieces</a><a href="#/collection/new" ${isNew ? 'aria-current="page"' : ''}>New arrivals</a>${categories.map(entry => `<a href="${categoryPath(entry)}" ${entry === category ? 'aria-current="page"' : ''}>${esc(entry)}</a>`).join('')}</nav>`}
      <div class="listing-tools"><span aria-live="polite">${items.length} ${items.length === 1 ? 'piece' : 'pieces'}</span><div><button type="button" class="outline-control" data-open="filters">${icon('filter',17)} Filters${tags.length ? ' (' + tags.length + ')' : ''}</button><label class="sr-only" for="sort">Sort products</label><select id="sort" class="outline-control">${sortOptions.map(([value,text]) => `<option value="${value}" ${value === sort ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></div></div>
      ${tags.length ? `<div class="filter-tags">${tags.map(([key,value]) => `<a class="filter-tag" href="${currentLink(route,{[key]:''})}" aria-label="Remove ${esc(value)} filter">${esc(value)} ${icon('close',14)}</a>`).join('')}<a class="text-link" href="${currentLink(route,{size:'',price:'',stock:''})}">Clear all</a></div>` : ''}
      ${items.length ? grid(items,{showNew:!isNew}) : empty(onlySaved ? 'Nothing saved yet.' : 'No pieces found.', onlySaved ? 'Tap the heart on a product to save it here.' : 'Try a different search or clear your filters.', onlySaved || query ? '#/shop' : currentLink(route,{size:'',price:'',stock:''}), onlySaved || query ? 'Browse the shop' : 'Clear filters')}</section>`;
  }

  function selectedGallery(product) {
    return product.gallery?.length ? product.gallery : [{image: product.image, alt: product.alt || product.name}];
  }

  function sizing(product, chosen = '') {
    return `<div class="size-options" role="group" aria-label="${esc(product.optionLabel || 'Size')}">${(product.sizes || []).map(size => `<button type="button" class="size-choice" data-size="${esc(size)}" aria-pressed="${chosen === size}" ${product.stock?.[size] > 0 ? '' : 'disabled'}>${esc(size)}</button>`).join('')}</div>`;
  }

  function productPage(route) {
    const product = available().find(item => item.id === route.parts[0]);
    if (!product) return missing();
    if (selection?.id !== product.id) selection = {id:product.id, image:0, size:product.sizes?.length === 1 && product.stock?.[product.sizes[0]] > 0 ? product.sizes[0] : '', color:product.colors?.[0]?.name || ''};
    const gallery = selectedGallery(product);
    const frame = gallery[selection.image] || gallery[0];
    const stock = product.stock?.[selection.size];
    const soldOut = !Object.values(product.stock || {}).some(quantity => quantity > 0);
    const related = available().filter(item => item.id !== product.id).sort((a,b)=>Number(b.category === product.category)-Number(a.category === product.category)).slice(0,4);
    return `<section class="shell product-page">${breadcrumbs(['Shop','#/shop'],[product.category,categoryPath(product.category)],[product.name])}
      <div class="product-layout"><div class="product-gallery"><div class="thumbnail-list" aria-label="Product images">${gallery.map((image,i) => `<button type="button" class="thumb ${image.detail ? 'detail-thumb' : ''}" data-image="${i}" aria-label="Show image ${i+1}: ${esc(image.alt)}" aria-pressed="${selection.image === i}">${img(image.image,'')}</button>`).join('')}</div>
      <div class="product-frame ${frame.detail ? 'detail-frame' : ''} ${selection.image !== 0 && !frame.detail ? 'styled-frame' : ''}">${img(frame.image,frame.alt,'fetchpriority="high"')}<button class="icon-button zoom-button" data-open="zoom" type="button" aria-label="Enlarge image">${icon('expand',20)}</button></div></div>
      <div class="product-info">${label(product.category + (product.isNew ? ' / New in' : ''))}<div class="product-title"><h1>${esc(product.name)}<em>.</em></h1>${saveButton(product,'product-save')}</div><p class="product-price">${product.oldPrice > product.price ? `<s>${money(product.oldPrice)}</s>` : ''}${money(product.price)}</p><p class="product-description">${esc(product.description)}</p>
      ${product.colors?.length ? `<div class="variant-heading">Color <span>${esc(selection.color)}</span></div><div class="color-options" role="group" aria-label="Color">${product.colors.map(color => `<button type="button" data-color="${esc(color.name)}" aria-label="${esc(color.name)}" aria-pressed="${selection.color === color.name}">${swatch(color)}</button>`).join('')}</div>` : ''}
      <div class="variant-heading size-heading">${esc(product.optionLabel || 'Size')}${AF.source.mode === 'dummy' && product.sizes?.some(size => size !== 'One size') ? ' <button class="text-link" data-open="size-guide" type="button">Size guide</button>' : ''}</div>${sizing(product,selection.size)}
      <p class="stock-message" aria-live="polite">${soldOut ? 'Sold out' : selection.size && stock < 5 ? `Only ${stock} left in this size` : selection.size ? 'In stock' : 'Select a size to check availability'}</p>
      <button type="button" class="button primary add-main" data-add="product" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Sold out' : 'Add to bag'} ${soldOut ? '' : '· ' + money(product.price)}</button>
      ${AF.source.mode === 'dummy' && !window.AF_RUNTIME?.apiBaseUrl ? `<div class="shipping-note">${icon('truck',20)} Complimentary US shipping on orders $150+</div>` : ''}
      <div class="product-accordions"><details><summary>Details & care</summary><ul>${(product.details || []).map(detail => `<li>${esc(detail)}</li>`).join('')}</ul></details><details><summary>Delivery & returns</summary><p>Standard delivery in 3–5 business days. Returns accepted within 30 days. <a class="text-link" href="#/info/shipping">See delivery details</a></p></details></div></div></div>
      ${related.length ? `<div class="related"><div class="section-heading"><h2>${AF.source.mode === 'api' ? 'You may also <em>like.</em>' : 'Wear it <em>with.</em>'}</h2><a class="text-link" href="#/shop">Explore the collection</a></div>${grid(related)}</div>` : ''}</section>`;
  }

  function galleryPage(route) {
    if (!AF.looks.length) return `<section class="shell listing">${empty('No lookbook yet.', 'Browse available products instead.')}</section>`;
    const look = AF.looks.find(item=>item.id === route.parts[0]);
    if (route.parts.length && !look) return missing();
    if (look) {
      const pieces = look.items.map(id => available().find(item => item.id === id)).filter(Boolean);
      return `<section class="shell gallery-page">${breadcrumbs(['Lookbook','#/gallery'],[look.name])}<div class="look-detail"><div class="look-detail-image">${img(look.image,look.alt,'fetchpriority="high"')}</div><div class="look-detail-copy">${label('The Motion Edit / Lookbook')}<h1>${esc(look.name)}<em>.</em></h1><p>${esc(look.line)}</p><h2>Shop the look</h2><div class="look-items">${pieces.map(item => `<div class="small-product"><a href="${productPath(item.id)}">${img(item.image,item.alt,'loading="lazy"')}</a><div><a href="${productPath(item.id)}">${esc(item.name)}</a><span>${money(item.price)}</span></div><button class="icon-button" type="button" data-quick="${esc(item.id)}" aria-label="Quick add ${esc(item.name)}">${icon('plus')}</button></div>`).join('')}</div><a class="text-link" href="#/gallery">Back to all looks</a></div></div></section>`;
    }
    return `<section class="shell gallery-page">${breadcrumbs(['Lookbook'])}<div class="page-heading gallery-heading"><div>${label('The Motion Edit')}<h1>In <em>motion.</em></h1></div><p>Three looks, from first light to last call. Open a look to find the pieces that make it.</p></div><div class="look-grid">${AF.looks.map(look => `<article><a class="look-cover" href="#/gallery/${esc(look.id)}">${img(look.image,look.alt,'loading="lazy"')}<span>${icon('plus',17)} Shop the look</span></a><h2><a href="#/gallery/${esc(look.id)}">${esc(look.name)}</a></h2><p>${esc(look.line)}</p></article>`).join('')}</div></section>`;
  }

  function infoPage() {
    if (AF.source.mode === 'api') {
      return `<article class="shell information">${breadcrumbs(['Delivery & returns'])}<div class="page-heading"><h1>Delivery &amp; returns</h1><p>Shipping and returns policies will be published by ${esc(config.brand)}.</p></div></article>`;
    }
    return `<article class="shell information">${breadcrumbs(['Delivery & returns'])}<div class="page-heading"><h1>Delivery &amp; returns<em>.</em></h1><p>United States · USD</p></div><div class="info-columns"><section><h2>Delivery</h2><p>Standard delivery takes 3–5 business days and costs $9. Standard delivery is complimentary on orders of $150 or more.</p><p>Express delivery takes 1–2 business days and costs $18. See the delivery charge in checkout before placing your order.</p><a class="text-link" href="#/track">Track an order</a></section><section><h2>Returns</h2><p>Our demo returns policy allows returns within 30 days for eligible unworn items in their original condition.</p><p>Delivery dates and returns are simulated in the AFTERFORM prototype.</p></section></div></article>`;
  }

  function missing() {
    return `<section class="shell listing">${empty('This page has moved.', 'Find your way back through the shop.')}</section>`;
  }

  function refresh({focus = false, resetScroll = false} = {}) {
    const previous = current;
    current = routeFromHash();
    renderHeader();
    if (current.page === 'home') main.innerHTML = home();
    else if (['shop','collection','category','saved','search'].includes(current.page)) main.innerHTML = catalogPage(current);
    else if (current.page === 'product') main.innerHTML = productPage(current);
    else if (current.page === 'gallery') main.innerHTML = galleryPage(current);
    else if (current.page === 'info' && current.parts[0] === 'shipping') main.innerHTML = infoPage();
    else if (checkoutPages.has(current.page) && window.AFCheckout) {
      main.innerHTML = AFCheckout.render(current);
      AFCheckout.bind(current);
    } else main.innerHTML = missing();
    const heading = main.querySelector('h1');
    document.title = AF.source.mode === 'api'
      ? `${current.page === 'home' ? 'Shop' : heading?.textContent?.replace(/[.]$/, '') || 'Shop'} — ${config.brand}`
      : current.page === 'home' ? 'AFTERFORM — Clothes for wherever you’re headed' : `${heading?.textContent?.replace(/[.]$/, '') || 'Shop'} — AFTERFORM`;
    if (resetScroll && (previous?.page !== current.page || previous?.parts.join('/') !== current.parts.join('/'))) window.scrollTo(0,0);
    if (focus) main.focus({preventScroll:true});
  }

  function bagPanel() {
    const items = AF.cartItems();
    const total = AF.totals(items);
    if (!items.length) return `<div class="bag-empty">${icon('bag',42)}<h3>Your bag is empty.</h3><a class="button primary" href="#/shop">Explore the shop</a></div>`;
    const remaining = Math.max(0,config.shippingFree - total.subtotal);
    return `<div class="bag-drawer-content">${AF.source.mode === 'dummy' && !window.AF_RUNTIME?.apiBaseUrl ? `<div class="shipping-progress"><p>${remaining ? `${money(remaining)} away from complimentary US shipping` : 'You’ve unlocked complimentary standard US shipping.'}</p><progress aria-label="Progress toward complimentary shipping" value="${Math.min(config.shippingFree,total.subtotal)}" max="${config.shippingFree}"></progress></div>` : ''}<div class="bag-drawer-items">${items.map(item => `<article class="drawer-item"><a href="${productPath(item.id)}">${img(item.image,item.name)}</a><div><a href="${productPath(item.id)}">${esc(item.name)}</a><span>${esc(item.color)}${item.size ? ' / ' + esc(item.size) : ''}</span><div class="quantity"><button type="button" data-bag-change="-1" data-id="${esc(item.id)}" data-size-value="${esc(item.size)}" data-color-value="${esc(item.color)}" aria-label="Decrease ${esc(item.name)} quantity">${icon('minus',14)}</button><span>${item.qty}</span><button type="button" data-bag-change="1" data-id="${esc(item.id)}" data-size-value="${esc(item.size)}" data-color-value="${esc(item.color)}" aria-label="Increase ${esc(item.name)} quantity" ${item.qty >= item.stock ? 'disabled' : ''}>${icon('plus',14)}</button></div></div><b>${money(item.price * item.qty)}</b></article>`).join('')}</div><div class="bag-drawer-end"><div><b>Subtotal</b><b>${money(total.subtotal)}</b></div><p>Delivery shown at checkout.</p><a class="button primary" href="#/checkout">Checkout</a><a class="button secondary" href="#/bag">View bag</a></div></div>`;
  }

  let quick = null;
  function open(kind, options = {}) {
    const wasOpen = dialog.open;
    if (!wasOpen) dialogTrigger = document.activeElement;
    dialogKind = kind;
    let title = '';
    let content = '';
    if (kind === 'search') {
      title = 'Find your piece';
      content = `<form class="search-form" id="search-form"><label class="sr-only" for="search-input">Search products</label>${icon('search')}<input id="search-input" name="q" type="search" placeholder="Try ‘leather’ or ‘trouser’" value="${esc(current.query.get('q') || '')}" required><button class="button primary" type="submit">Search</button></form><div class="search-suggestions" id="search-suggestions"></div>`;
    } else if (kind === 'bag') {
      const count = AF.cart().reduce((sum,item)=>sum + item.qty,0);
      title = `Your bag (${count})`;
      content = bagPanel();
    } else if (kind === 'menu') {
      title = config.brand;
      content = `<nav class="drawer-navigation" aria-label="Mobile navigation">${[...navLinks,['Saved items','#/saved'],['My account',AF.getSession() ? '#/account' : '#/login'],['Track an order','#/track']].map(([name,href])=>`<a href="${esc(href)}">${esc(name)}</a>`)}.join('')}</nav>`;
    } else if (kind === 'filters') {
      title = 'Filters';
      const options = [...new Set(available().flatMap(product=>product.sizes || []))];
      const threshold = AF.source.mode === 'api' && config.currency === 'VND' ? 500000 : 50;
      const upper = threshold * 2;
      content = `<form id="filter-form" class="filter-form"><label for="filter-size">${esc(config.productOptionLabel || 'Size')}</label><select id="filter-size" name="size"><option value="">All options</option>${options.map(size=>`<option ${current.query.get('size')===size?'selected':''}>${esc(size)}</option>`).join('')}</select><label for="filter-price">Price</label><select id="filter-price" name="price">${[['','All prices'],[String(threshold),'Under ' + money(threshold)],[String(upper),'Under ' + money(upper)],['over-' + upper,money(upper) + ' and up']].map(([value, text])=>`<option value="${value}" ${current.query.get('price')===value?'selected':''}>${text}</option>`).join('')}</select><label class="checkbox-label"><input type="checkbox" name="stock" value="1" ${current.query.get('stock')==='1'?'checked':''}> In stock only</label><button class="button primary">Show results</button><a class="text-link" href="${currentLink(current,{size:'',price:'',stock:''})}">Clear filters</a></form>`;
    } else if (kind === 'quick') {
      const product = available().find(item=>item.id === options.id);
      if (!product) return;
      quick = {id: product.id, size: product.sizes?.length === 1 && product.stock?.[product.sizes[0]] > 0 ? product.sizes[0] : '', color: product.colors?.[0]?.name || ''};
      title = 'Quick add';
      const inStock = Object.values(product.stock || {}).some(count=>count > 0);
      content = `<div class="quick-content"><div class="quick-product">${img(product.image,product.alt)}<div><h3>${esc(product.name)}</h3><p>${money(product.price)}</p><a class="text-link" href="${productPath(product.id)}">View details</a></div></div>${product.colors?.length ? `<label class="quick-color-label" for="quick-color">Color</label><select class="outline-control" id="quick-color">${product.colors.map(color=>`<option>${esc(color.name)}</option>`).join('')}</select>` : ''}<h4>Size</h4>${sizing(product,quick.size)}<p class="quick-feedback" aria-live="polite"></p><button class="button primary" type="button" data-add="quick" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to bag' : 'Sold out'}</button></div>`;
    } else if (kind === 'zoom') {
      const product = available().find(item=>item.id === selection?.id);
      if (!product) return;
      const gallery = selectedGallery(product);
      const frame = gallery[selection.image];
      title = product.name;
      content = `<div class="zoom-image ${frame.detail ? 'detail-frame' : ''}">${img(frame.image,frame.alt)}</div><div class="zoom-controls"><button class="icon-button" type="button" data-zoom-step="-1" aria-label="Previous image">${icon('left')}</button><span>${selection.image + 1} / ${gallery.length}</span><button class="icon-button" type="button" data-zoom-step="1" aria-label="Next image">${icon('right')}</button></div>`;
    } else if (kind === 'size-guide') {
      title = 'Size guide';
      content = `<div class="size-guide"><p>Measure around the fullest part of your chest and your natural waist. See Details &amp; care for guidance on how each piece fits.</p><table><caption>Body measurements in inches</caption><thead><tr><th>Size</th><th>Chest</th><th>Waist</th></tr></thead><tbody>${[['XS','32–34','25–27'],['S','34–36','27–29'],['M','36–39','29–32'],['L','39–42','32–35'],['XL','42–45','35–38']].map(row=>`<tr>${row.map(value=>`<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    } else return;
    dialog.className = `overlay overlay-${kind}`;
    dialog.innerHTML = `<div class="dialog-head"><h2 id="overlay-title">${esc(title)}</h2><button type="button" class="icon-button" data-close-dialog aria-label="Close">${icon('close',23)}</button></div>${content}`;
    if (!wasOpen) dialog.showModal();
    document.body.classList.add('overlay-open');
    if (kind === 'search') { searchSuggestions(); dialog.querySelector('#search-input').focus(); }
    else if (options.focusSelector) dialog.querySelector(options.focusSelector)?.focus();
    else dialog.querySelector('[data-close-dialog]').focus();
  }

  function close(restore = true) {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove('overlay-open');
    if (restore) {
      if (dialogTrigger?.isConnected) dialogTrigger.focus();
      else (document.querySelector(`[data-open="${dialogKind}"]`) || main).focus({preventScroll:true});
    }
    dialogKind = '';
  }

  function searchSuggestions() {
    const input = dialog.querySelector('#search-input');
    const suggestions = dialog.querySelector('#search-suggestions');
    const query = input.value.trim().toLowerCase();
    if (!query) {
      suggestions.innerHTML = `<p>Browse by category</p><div class="suggestion-tags">${categoryNames().map(category=>`<a href="${categoryPath(category)}">${esc(category)}</a>`).join('')}</div>`;
      return;
    }
    const matches = available().filter(product => [product.name,product.category,product.description].some(value => String(value ?? '').toLowerCase().includes(query))).slice(0,4);
    suggestions.innerHTML = matches.length ? `<p>Matching pieces</p>${matches.map(item=>`<div class="small-product"><a href="${productPath(item.id)}">${img(item.image,item.alt)}</a><div><a href="${productPath(item.id)}">${esc(item.name)}</a><span>${money(item.price)}</span></div></div>`).join('')}` : '<p>No matching pieces. Try another search.</p>';
  }

  function addFrom(source) {
    const item = source === 'quick' ? quick : selection;
    const feedback = source === 'quick' ? dialog.querySelector('.quick-feedback') : main.querySelector('.stock-message');
    if (!item?.size) {
      feedback.textContent = 'Choose a size to add this piece.';
      feedback.classList.add('is-error');
      (source === 'quick' ? dialog : main).querySelector('.size-choice:not(:disabled)')?.focus();
      return;
    }
    const result = AF.addCart(item.id,item.size,item.color);
    if (!result.ok) {
      feedback.textContent = result.error;
      feedback.classList.add('is-error');
      return;
    }
    open('bag');
    renderHeader();
    toast('Added to your bag.');
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('button, a');
    if (!target) return;
    if (target.classList.contains('skip-link')) { event.preventDefault(); main.focus(); main.scrollIntoView(); return; }
    if (target.matches('[data-close-dialog]')) { close(); return; }
    if (dialog.contains(target) && target.matches('a[href^="#/"]')) close(false);
    const d = target.dataset;
    if (d.open) { open(d.open); return; }
    if (d.quick) { open('quick',{id:d.quick}); return; }
    if (d.add) { addFrom(d.add); return; }
    if (d.save) {
      const list = saved();
      const exists = list.includes(d.save);
      AF.write('saved',exists ? list.filter(id=>id!==d.save) : [...list,d.save]);
      if (current.page === 'saved') { refresh(); main.focus({preventScroll:true}); }
      else target.setAttribute('aria-pressed',String(!exists));
      toast(exists ? 'Removed from saved pieces.' : 'Saved for later.');
      return;
    }
    if (d.slide !== undefined && heroIndex !== Number(d.slide)) {
      heroIndex = Number(d.slide);
      const hero = main.querySelector('#hero');
      hero.innerHTML = heroContent();
      hero.classList.remove('hero-shift');
      requestAnimationFrame(()=>hero.classList.add('hero-shift'));
      hero.querySelector(`[data-slide="${heroIndex}"]`).focus({preventScroll:true});
      return;
    }
    if (d.size !== undefined) {
      if (dialogKind === 'quick' && dialog.contains(target)) {
        quick.size = d.size;
        dialog.querySelectorAll('[data-size]').forEach(button=>button.setAttribute('aria-pressed', String(button === target)));
        dialog.querySelector('.quick-feedback').textContent = '';
      } else if (selection) {
        const index = [...main.querySelectorAll('[data-size]')].indexOf(target);
        selection.size = d.size;
        refresh();
        main.querySelectorAll('[data-size]')[index]?.focus({preventScroll:true});
      }
      return;
    }
    if (d.color !== undefined || d.image !== undefined) {
      if (d.color !== undefined) selection.color = d.color;
      else selection.image = Number(d.image);
      const index = [...main.querySelectorAll(d.color !== undefined ? '[data-color]' : '[data-image]')].indexOf(target);
      refresh();
      main.querySelectorAll(d.color !== undefined ? '[data-color]' : '[data-image]')[index]?.focus({preventScroll:true});
      return;
    }
    if (d.zoomStep) {
      const product = available().find(item=>item.id === selection.id);
      const count = selectedGallery(product).length;
      selection.image = (selection.image + Number(d.zoomStep) + count) % count;
      refresh();
      open('zoom',{focusSelector:`[data-zoom-step="${d.zoomStep}"]`});
      return;
    }
    if (d.bagChange) {
      const line = AF.cart().find(item=>item.id===d.id && item.size===d.sizeValue && item.color===d.colorValue);
      if (!line) return;
      const result = AF.updateCart(line.id,line.size,line.color,line.qty + Number(d.bagChange));
      if (!result.ok) toast(result.error);
      else {
        renderHeader();
        open('bag');
        const matching = [...dialog.querySelectorAll('[data-bag-change]')].find(button=>button.dataset.id===d.id && button.dataset.sizeValue===d.sizeValue && button.dataset.colorValue===d.colorValue && button.dataset.bagChange===d.bagChange && !button.disabled);
        matching?.focus();
      }
    }
  });

  document.addEventListener('change', event => {
    if (event.target.id === 'sort') go(currentLink(current,{sort:event.target.value === 'featured' ? '' : event.target.value}));
    if (event.target.id === 'quick-color' && quick) quick.color = event.target.value;
  });
  document.addEventListener('input', event => { if (event.target.id === 'search-input') searchSuggestions(); });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!['search-form','filter-form','newsletter'].includes(form.id)) return;
    event.preventDefault();
    const data = new FormData(form);
    if (form.id === 'search-form') {
      const query = data.get('q').trim();
      if (!query) return;
      close(false);
      go(`#/search?q=${encodeURIComponent(query)}`);
    } else if (form.id === 'filter-form') {
      close(false);
      go(currentLink(current,{size:data.get('size'),price:data.get('price'),stock:data.get('stock')}));
    } else {
      const email = document.querySelector('#newsletter-email').value.trim().toLowerCase();
      const addresses = AF.read('newsletter', []);
      const duplicate = addresses.includes(email);
      if (!duplicate) AF.write('newsletter',[...addresses,email]);
      form.nextElementSibling.textContent = duplicate ? 'You’re already on the list.' : 'You’re on the list.';
      form.reset();
    }
  });
  dialog.addEventListener('cancel', event=>{event.preventDefault();close();});
  dialog.addEventListener('click', event=>{
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  window.addEventListener('hashchange', () => { close(false); refresh({focus:true,resetScroll:true}); });
  window.addEventListener('storage', event => {
    if (event.key?.startsWith('afterform-v') && !dialog.open && !main.contains(document.activeElement)) refresh();
  });

  window.AFUI = {refresh, toast, go, open};
  if (AF.source.mode === 'api') {
    document.title = config.brand + ' — Shop';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = config.description || config.brand;
    const announcement = document.querySelector('.announcement p');
    if (announcement) announcement.textContent = config.description || config.brand;
    const market = document.querySelector('.announcement .market');
    if (market) market.textContent = [config.market, config.currency].filter(Boolean).join(' · ');
  } else if (AF.source.storeId !== 'afterform' || window.AF_RUNTIME?.apiBaseUrl) {
    const announcement = document.querySelector('.announcement p');
    if (announcement) announcement.textContent = 'Demo fallback — backend catalog unavailable; live checkout disabled';
  }
  renderFooter();
  refresh();
}());
