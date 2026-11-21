(() => {
  "use strict";

  const main = document.querySelector(".admin-main");
  const nav = document.querySelector(".rail-nav");
  const rail = document.querySelector(".rail");
  const railToggle = document.querySelector(".rail-toggle");
  const dialog = document.querySelector(".admin-dialog");
  const toast = document.querySelector(".admin-toast");
  const AF = window.AF;

  if (!AF) {
    main.innerHTML = '<h1>Store desk</h1><p>The demo data could not be loaded. Refresh the page to try again.</p>';
    return;
  }

  const icons = {
    grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    orders:'<path d="M6 3h12v17l-3-2-3 2-3-2-3 2zM9 8h6m-6 4h6"/>',
    shirt:'<path d="M8 4 2 7l3 5 3-1v10h8V11l3 1 3-5-6-3c-.5 2-1.7 3-4 3S8.5 6 8 4Z"/>',
    box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4Z m0 0 9 4 9-4m-9 4v10M7.5 5 16 9"/>',
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3m2-16a3 3 0 0 1 0 6m1 3a4 4 0 0 1 3 4v3"/>',
    tag:'<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1"/>',
    chart:'<path d="M3 3v18h18M7 15l4-5 4 2 5-6"/>',
    store:'<path d="M3 9l2-5h14l2 5v3a3 3 0 0 1-5 2 3 3 0 0 1-4 0 3 3 0 0 1-4 0 3 3 0 0 1-5-2ZM5 15v6h14v-6M3 9h18"/>',
    calendar:'<rect x="3" y="5" width="18" height="16"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    money:'<path d="M12 2v20m5-16H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6"/>',
    bag:'<path d="M5 8h14l2 13H3L5 8Zm4 1V6a3 3 0 0 1 6 0v3"/>',
    warning:'<path d="M12 3 2 20h20L12 3Zm0 6v4m0 3v1"/>',
    card:'<rect x="3" y="5" width="18" height="14"/><path d="M3 10h18m-14 5h4"/>',
    chevron:'<path d="m6 9 6 6 6-6"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    close:'<path d="m5 5 14 14M19 5 5 19"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>'
  };
  const pages = {
    overview:{name:"Overview", icon:"grid"},
    orders:{name:"Orders", icon:"orders"},
    products:{name:"Products", icon:"shirt"},
    inventory:{name:"Inventory", icon:"box"},
    customers:{name:"Customers", icon:"people"},
    discounts:{name:"Discounts", icon:"tag"},
    analytics:{name:"Analytics", icon:"chart"}
  };
  const groups = {Operations:["overview", "orders", "products", "inventory"], Business:["customers", "discounts", "analytics"]};
  const options = {
    status:["Open", "Completed", "Cancelled"],
    payment:["Paid", "Pending", "Refunded"],
    fulfillment:["Unfulfilled", "Packed", "Shipped", "Delivered"]
  };
  const statusStyles = {
    open:"warn", pending:"warn", unfulfilled:"warn", packed:"move", shipped:"move",
    completed:"good", paid:"good", delivered:"good", active:"good", healthy:"good",
    cancelled:"bad", refunded:"bad", "out of stock":"bad", "low stock":"warn"
  };
  const state = {route:"overview", query:new URLSearchParams(), dateRange:30, chartMode:"revenue", chartPin:null, tablePage:1};
  const pageSize = 12;
  const standardDate = new Intl.DateTimeFormat("en-US", {month:"short", day:"numeric", year:"numeric"});
  const shortDate = new Intl.DateTimeFormat("en-US", {month:"short", day:"numeric"});
  const wholeNumber = new Intl.NumberFormat("en-US", {maximumFractionDigits:0});
  const wholeMoney = new Intl.NumberFormat("en-US", {style:"currency", currency:"USD", maximumFractionDigits:0});
  const toNum = value => Number(value) || 0;
  const str = value => String(value ?? "");
  const lower = value => str(value).toLocaleLowerCase();
  const escape = value => str(value).replace(/[&<>"']/g, character => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[character]));
  const icon = (name, size = 17) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ""}</svg>`;
  const money = value => escape(AF.money(toNum(value)));
  const dateText = order => isNaN(new Date(order.date)) ? "—" : standardDate.format(new Date(order.date));
  const stockOf = product => Object.values(product.stock || {}).reduce((sum, amount) => sum + toNum(amount), 0);
  const allOrders = () => [...AF.getOrders()].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allCoupons = () => AF.read("discounts", [{code:"AFTER10", type:"percent", value:10, active:true}]);
  const pill = status => `<span class="status status-${statusStyles[lower(status)] || "plain"}">${escape(status || "—")}</span>`;
  const stockLabel = total => total === 0 ? "Out of stock" : total <= 10 ? "Low stock" : "Healthy";
  const productStatus = product => product.archived ? "Archived" : product.hidden || lower(product.status) === "draft" ? "Draft" : product.status || "Active";
  const initials = name => str(name).trim().split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() || "").join("");
  const queryLink = (route, query) => `#${route}${query ? `?${new URLSearchParams(query)}` : ""}`;
  const action = (label, name, id) => `<button class="text-button" type="button" data-admin-action="${name}" data-id="${escape(id)}">${escape(label)}</button>`;

  const safeImage = value => {
    const source = str(value).trim();
    return /^(https?:\/\/|(?:\.\/)?assets\/|[\w-]+\.(?:jpg|jpeg|webp|avif|png)$)/i.test(source) ? source : "";
  };

  function optionList(list, value) {
    return list.map(input => {
      const [key, label] = Array.isArray(input) ? input : [input, input];
      return `<option value="${escape(key)}" ${lower(key) === lower(value) ? "selected" : ""}>${escape(label)}</option>`;
    }).join("");
  }

  function select(name, label, values, value, withIcon = "") {
    const iconMarkup = withIcon ? icon(withIcon, 15).replace("<svg", '<svg class="select-icon"') : "";
    return `<span class="select-wrap ${withIcon ? "with-icon" : ""}">${iconMarkup}<select data-select="${name}" aria-label="${escape(label)}">${optionList(values, value)}</select>${icon("chevron")}</span>`;
  }

  function pageHead(title, description, actions = "", kicker = "") {
    return `<header class="page-head"><div>${kicker ? `<p class="page-kicker">${escape(kicker)}</p>` : ""}<h1>${escape(title)}</h1><p>${escape(description)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
  }

  function panelHead(title, subtitle = "", trailing = "") {
    return `<header class="panel-head"><div><h2>${escape(title)}</h2>${subtitle ? `<p>${escape(subtitle)}</p>` : ""}</div>${trailing}</header>`;
  }

  function dateAt(offset) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date;
  }

  function performance(orders) {
    const sales = orders.filter(order => lower(order.payment) === "paid" && lower(order.status) !== "cancelled");
    const active = orders.filter(order => lower(order.status) !== "cancelled");
    const revenue = sales.reduce((sum, order) => sum + toNum(order.total), 0);
    const aov = sales.length ? revenue / sales.length : 0;
    return {sales, active, revenue, aov, customers:new Set(active.map(order => lower(order.email || order.customer))).size};
  }

  function getReport(orders) {
    const start = dateAt(1 - state.dateRange);
    const end = dateAt(1);
    const previousStart = dateAt(1 - state.dateRange * 2);
    const currentOrders = orders.filter(order => +new Date(order.date) >= +start && +new Date(order.date) < +end);
    const previousOrders = orders.filter(order => +new Date(order.date) >= +previousStart && +new Date(order.date) < +start);
    return {start, end, current:performance(currentOrders), previous:performance(previousOrders)};
  }

  function metric(label, formatted, value, previous, glyph) {
    const percent = previous ? Math.round((value - previous) / previous * 1000) / 10 : null;
    const change = percent === null ? "—" : `${percent > 0 ? "+" : ""}${percent}%`;
    return `<div class="metric"><div class="metric-label"><span>${escape(label)}</span>${icon(glyph, 15)}</div><strong class="metric-value">${escape(formatted)}</strong><div class="metric-trend ${percent < 0 ? "negative" : ""}"><span>${change}</span><span>${percent === null ? "No prior activity" : "vs previous period"}</span></div></div>`;
  }

  function metrics(report) {
    const {current, previous} = report;
    return `<div class="metric-grid" aria-label="Performance summary">${metric("Paid revenue", AF.money(current.revenue), current.revenue, previous.revenue, "money")}${metric("Orders", wholeNumber.format(current.active.length), current.active.length, previous.active.length, "orders")}${metric("Avg. order value", AF.money(current.aov), current.aov, previous.aov, "bag")}${metric("Customers", wholeNumber.format(current.customers), current.customers, previous.customers, "people")}</div>`;
  }

  function chartBuckets(orders, offset, previous = false) {
    const span = state.dateRange === 7 ? 1 : state.dateRange / 10;
    return Array.from({length:Math.ceil(state.dateRange / span)}, (_, index) => {
      const day = offset + index * span;
      const start = dateAt(day);
      const endDay = Math.min(day + span, offset + state.dateRange);
      const end = dateAt(endDay);
      const values = orders.filter(order => +new Date(order.date) >= +start && +new Date(order.date) < +end);
      const value = state.chartMode === "revenue" ? values.reduce((sum, order) => sum + toNum(order.total), 0) : values.length;
      const label = span === 1 ? shortDate.format(start) : `${shortDate.format(start)} – ${shortDate.format(dateAt(endDay - 1))}`;
      return {value, start, label, previous};
    });
  }

  function chart(report) {
    const isRevenue = state.chartMode === "revenue";
    const period = 1 - state.dateRange;
    const current = chartBuckets(report.current[isRevenue ? "sales" : "active"], period);
    const previous = chartBuckets(report.previous[isRevenue ? "sales" : "active"], period - state.dateRange, true);
    const peak = Math.max(1, ...current.concat(previous).map(point => point.value));
    const step = isRevenue ? Math.max(100, Math.ceil(peak / 400) * 100) : Math.max(1, Math.ceil(peak / 4));
    const narrow = window.matchMedia("(max-width: 480px)").matches;
    const width = narrow ? 425 : 620;
    const height = 194;
    const startX = 54;
    const endX = width - 12;
    const baseline = 157;
    const gridHeight = 141;
    const gap = (endX - startX) / (current.length - 1);
    const x = index => startX + gap * index;
    const y = value => baseline - value / (step * 4) * gridHeight;
    const points = series => series.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
    const tick = number => isRevenue ? wholeMoney.format(number) : wholeNumber.format(number);
    const yGrid = Array.from({length:5}, (_, index) => `<line class="chart-gridline" x1="${startX}" x2="${endX}" y1="${y(step * index)}" y2="${y(step * index)}"/><text class="chart-axis" x="${startX - 8}" y="${y(step * index) + 3}" text-anchor="end">${escape(tick(step * index))}</text>`).join("");
    const labelCount = narrow ? 4 : 6;
    const labelIndices = new Set(Array.from({length:labelCount}, (_, index) => Math.round(index * (current.length - 1) / (labelCount - 1))));
    const xAxis = current.map((point, index) => {
      if (!labelIndices.has(index)) return "";
      return `<text class="chart-axis" x="${x(index)}" y="182" text-anchor="${index === current.length - 1 ? "end" : index === 0 ? "start" : "middle"}">${shortDate.format(point.start)}</text>`;
    }).join("");
    const graphic = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><polygon class="chart-area" points="${startX},${baseline} ${points(current)} ${endX},${baseline}"/>${yGrid}${xAxis}<polyline class="chart-compare" points="${points(previous)}"/><polyline class="chart-line" points="${points(current)}"/>${current.map((point, index) => `<circle class="chart-dot" cx="${x(index)}" cy="${y(point.value)}" r="3"/>`).join("")}</svg>`;
    const ticks = current.map((point, index) => {
      const left = (x(index) - gap / 2) / width * 100;
      const clickWidth = gap / width * 100;
      const amount = isRevenue ? AF.money(point.value) : `${point.value} orders`;
      const comparison = isRevenue ? AF.money(previous[index].value) : `${previous[index].value} orders`;
      return `<button class="chart-column" type="button" aria-label="${escape(`${point.label}, ${amount}; previous period, ${comparison}`)}" aria-pressed="${state.chartPin === index}" data-point="${index}" data-label="${escape(point.label)}" data-point-value="${escape(amount)}" data-compare="${escape(comparison)}" style="left:${Math.max(0, left)}%;width:${Math.min(clickWidth, 100 - left)}%"></button>`;
    }).join("");
    const tabs = `<div class="chart-tabs" aria-label="Chart metric">${[["revenue", "Revenue"], ["orders", "Orders"]].map(([key,label]) => `<button type="button" class="chart-tab ${state.chartMode === key ? "sort-active" : ""}" data-admin-action="chart-mode" data-id="${key}" aria-pressed="${state.chartMode === key}">${label}</button>`).join("")}</div>`;
    const periodLabel = `${shortDate.format(report.start)} – ${shortDate.format(dateAt(0))}`;
    const headline = isRevenue ? AF.money(report.current.revenue) : `${report.current.active.length} orders`;
    return `<section class="panel" aria-label="Sales performance">${panelHead("Sales performance", isRevenue ? "Paid order totals in USD" : "Orders placed, excluding cancellations", tabs)}<div class="chart-readout" data-period="${escape(periodLabel)}" data-total="${escape(headline)}"><strong>${escape(headline)}</strong><span>${escape(periodLabel)}</span></div><div class="chart-plot">${graphic}${ticks}</div><div class="chart-legend"><span>Current period</span><span>Previous period</span></div></section>`;
  }

  function thumbnail(product, small = "") {
    const image = safeImage(product.image);
    return `<div class="product-mini">${image ? `<img class="product-thumb" src="${escape(image)}" alt="" loading="lazy">` : '<span class="product-thumb" aria-hidden="true"></span>'}<div><strong>${escape(product.name)}</strong>${small ? `<small>${escape(small)}</small>` : ""}</div></div>`;
  }

  function rankedProducts(report, limit = 4) {
    const ranked = new Map();
    report.current.sales.forEach(order => (order.items || []).forEach(item => {
      const previous = ranked.get(item.id) || {...item, volume:0, earnings:0};
      previous.volume += toNum(item.qty);
      previous.earnings += toNum(item.qty) * toNum(item.price);
      ranked.set(item.id, previous);
    }));
    const records = [...ranked.values()].sort((a,b) => b.earnings - a.earnings).slice(0, limit);
    return `<section class="panel">${panelHead("Top products", "By merchandise sales before discounts", '<a class="text-button" href="#products">Catalog</a>')}<div class="product-list">${records.length ? records.map(item => `<div class="product-ranked">${thumbnail(item)}<div class="rank-value"><strong>${money(item.earnings)}</strong><small>${item.volume} ${item.volume === 1 ? "unit" : "units"}</small></div></div>`).join("") : '<p class="empty-state">No paid product sales in this period.</p>'}</div></section>`;
  }

  function attention(orders, catalog) {
    const open = orders.filter(order => lower(order.status) === "open");
    const waiting = open.filter(order => lower(order.fulfillment) === "unfulfilled").length;
    const pending = open.filter(order => lower(order.payment) === "pending").length;
    const low = catalog.filter(item => stockOf(item) <= 10).length;
    const targets = [
      ["box", "Awaiting fulfillment", "Unfulfilled orders", waiting, queryLink("orders", {fulfillment:"Unfulfilled", status:"Open"})],
      ["warning", "Low stock", "10 units or fewer", low, queryLink("inventory", {stock:"low"})],
      ["card", "Pending payments", "Open orders awaiting payment", pending, queryLink("orders", {payment:"Pending", status:"Open"})]
    ];
    return `<section class="panel attention-panel">${panelHead("Needs attention", "Open tasks across the store")}<div class="attention-list">${targets.map(([glyph,title,detail,count,link]) => `<a class="attention-item" href="${link}"><span class="attention-icon">${icon(glyph, 16)}</span><span><strong>${title}</strong><small>${detail}</small></span><span class="attention-count">${count}</span></a>`).join("")}</div><div class="attention-footer"><a class="button button-accent" href="${queryLink("orders", {status:"Open"})}">Review open orders</a></div></section>`;
  }

  function table(headers, rows, empty) {
    return rows.length ? `<div class="table-scroll" tabindex="0" role="region" aria-label="${escape(headers[0])} table"><table class="data-table"><thead><tr>${headers.map((name, index) => `<th scope="col" class="${index === headers.length - 1 ? "align-right" : ""}">${name}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value, index) => `<td class="${index === row.length - 1 ? "align-right" : ""}">${value}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<p class="empty-state">${escape(empty)}</p>`;
  }

  function recentOrders(orders) {
    const rows = orders.slice(0, 5).map(order => [action(`#${order.id}`, "order", order.id), escape(order.customer), pill(order.payment), pill(order.fulfillment), `<span class="amount">${money(order.total)}</span>`]);
    return `<section class="panel">${panelHead("Recent orders", "Latest activity across the store", '<a class="text-button" href="#orders">All orders</a>')}${table(["Order", "Customer", "Payment", "Fulfillment", "Total"], rows, "No orders yet.")}</section>`;
  }

  function renderDashboard(orders, products, analytical) {
    const report = getReport(orders);
    const range = select("range", "Date range", [[7,"Last 7 days"], [30,"Last 30 days"], [60,"Last 60 days"]], state.dateRange, "calendar");
    return pageHead(analytical ? "Analytics" : "Store overview", analytical ? "Review sales, order volume and product performance by period." : "Sales and store operations at a glance.", range, analytical ? "Business" : "Operations") + metrics(report) + `<div class="dashboard-grid">${chart(report)}${analytical ? rankedProducts(report, 5) : attention(orders, products)}</div>` + (analytical ? `<section class="panel">${panelHead("About these metrics")}` + '<div class="dialog-body"><p>Paid revenue includes shipping and discounts for orders marked paid. Average order value divides that revenue by the number of paid orders.</p><p>Order count and unique customers include all orders placed in the period, excluding cancelled orders.</p></div></section>' : `<div class="dashboard-grid">${recentOrders(orders)}${rankedProducts(report)}</div>`);
  }

  function searchForm(name, placeholder, filters = "") {
    return `<div class="table-tools"><form id="table-search"><label class="search-wrap">${icon("search", 15)}<span class="sr-only">${escape(name)}</span><input name="q" type="search" value="${escape(state.query.get("q"))}" placeholder="${escape(placeholder)}"></label><button type="submit" class="button-subtle">Search</button>${filters}${state.query.size ? '<button type="button" class="text-button" data-admin-action="clear-filters">Clear filters</button>' : ""}</form></div>`;
  }

  function paginatedTable(name, headers, records, renderRow, empty, controls = "") {
    const count = records.length;
    const maxPage = Math.max(1, Math.ceil(count / pageSize));
    state.tablePage = Math.min(maxPage, state.tablePage);
    const start = (state.tablePage - 1) * pageSize;
    const end = Math.min(count, start + pageSize);
    const paginate = maxPage > 1 ? `<div class="pagination"><button class="button-subtle" data-admin-action="previous" type="button" ${state.tablePage === 1 ? "disabled" : ""}>Previous</button><button class="button-subtle" data-admin-action="next" type="button" ${state.tablePage === maxPage ? "disabled" : ""}>Next</button></div>` : "";
    return `<section class="panel" aria-label="${escape(name)}">${controls}${table(headers, records.slice(start, end).map(renderRow), empty)}<div class="table-meta"><span>${count ? `${start + 1}–${end} of ${count}` : "0 results"}</span>${paginate}</div></section>`;
  }

  function matchesQuery(...values) {
    const query = lower(state.query.get("q")).trim();
    return !query || lower(values.join(" ")).includes(query);
  }

  function filterOptions(key, empty, choices) {
    return select(`filter-${key}`, empty, [["",empty], ...choices], state.query.get(key));
  }

  function renderOrders(orders) {
    const rows = orders.filter(order => matchesQuery(order.id, order.customer, order.email, ...(order.items || []).map(item => item.name)) && Object.keys(options).every(key => !state.query.has(key) || lower(order[key]) === lower(state.query.get(key))));
    const filters = filterOptions("status", "All order statuses", options.status) + filterOptions("payment", "All payments", options.payment) + filterOptions("fulfillment", "All fulfillment", options.fulfillment);
    return pageHead("Orders", "Review customer purchases, payments and fulfillment.", `<button type="button" class="button-subtle" data-admin-action="export-orders">${icon("download", 15)}Export CSV</button>`, "Operations") + paginatedTable("Orders", ["Order", "Date", "Customer", "Status", "Payment", "Fulfillment", "Total"], rows, order => [action(`#${order.id}`, "order", order.id), escape(dateText(order)), escape(order.customer), pill(order.status), pill(order.payment), pill(order.fulfillment), `<span class="amount">${money(order.total)}</span>`], "No matching orders. Adjust the filters or search for a different order.", searchForm("Search orders", "Search name, email or order", filters));
  }

  function renderProducts(catalog, inventory = false) {
    const categories = [...new Set(catalog.map(item => item.category).filter(Boolean))].sort();
    const productRows = catalog.filter(product => {
      if (state.query.has("category") && product.category !== state.query.get("category")) return false;
      if (state.query.get("stock") === "low" && stockOf(product) > 10) return false;
      if (state.query.get("stock") === "out" && stockOf(product) > 0) return false;
      return matchesQuery(product.name, product.category, product.id);
    });
    if (inventory) productRows.sort((a, b) => stockOf(a) - stockOf(b));
    const filters = filterOptions("category", "All categories", categories) + (inventory ? filterOptions("stock", "All stock levels", [["low","10 units or fewer"], ["out","Out of stock"]]) : "");
    const title = inventory ? "Inventory" : "Products";
    const headers = inventory ? ["Product", "SKU", "Sizes", "Available", "Stock level", "Action"] : ["Product", "SKU", "Category", "Price", "Status", "Action"];
    const create = inventory ? "" : `<button type="button" class="button button-accent" data-admin-action="create-product">${icon("plus", 16)}Add product</button>`;
    return pageHead(title, inventory ? "Check availability and update quantities by size." : "Edit merchandise, categories, options and storefront pricing.", create, "Operations") + paginatedTable(title, headers, productRows, product => {
      const available = stockOf(product);
      const units = `<span class="amount">${available}</span>`;
      const common = [thumbnail(product), escape(product.id)];
      return common.concat(inventory ? [escape((product.sizes || []).join(", ")), units, pill(stockLabel(available)), action("Adjust stock", "stock", product.id)] : [escape(product.category), money(product.price), pill(productStatus(product)), action("Edit product", "product", product.id)]);
    }, "No matching products. Adjust filters or search for a different product.", searchForm(`Search ${lower(title)}`, "Search product or SKU", filters));
  }

  function customerList(orders) {
    const customers = new Map();
    orders.forEach(order => {
      const id = lower(order.email || order.customer);
      if (!customers.has(id)) customers.set(id, {id, name:order.customer, email:order.email, address:order.address, orders:[], total:0});
      const person = customers.get(id);
      person.orders.push(order);
      if (lower(order.payment) === "paid" && lower(order.status) !== "cancelled") person.total += toNum(order.total);
    });
    return [...customers.values()];
  }

  function renderCustomers(orders) {
    const customers = customerList(orders).filter(person => matchesQuery(person.name, person.email));
    return pageHead("Customers", "See contact details and purchase history for customers who have placed orders.", "", "Business") + paginatedTable("Customers", ["Customer", "Email", "Orders", "Paid total", "Last order"], customers, person => [action(person.name, "customer", person.id), escape(person.email || "—"), person.orders.length, money(person.total), escape(dateText(person.orders[0]))], "No customers match this search.", searchForm("Search customers", "Search name or email"));
  }

  function renderDiscounts() {
    const coupons = allCoupons().filter(coupon => matchesQuery(coupon.code) && (!state.query.get("active") || (state.query.get("active") === "yes") === Boolean(coupon.active)));
    return pageHead("Discounts", "Create and manage percentage or fixed-value checkout codes.", `<button type="button" class="button button-accent" data-admin-action="create-discount">${icon("plus", 16)}Add discount</button>`, "Business") + paginatedTable("Discounts", ["Code", "Value", "Status", "Action"], coupons, coupon => [`<strong>${escape(coupon.code)}</strong>`, coupon.type === "percent" ? `${toNum(coupon.value)}%` : money(coupon.value), pill(coupon.active ? "Active" : "Inactive"), action("Edit discount", "discount", coupon.code)], "No discounts match this search.", searchForm("Search discount codes", "Search discount code", filterOptions("active", "All statuses", [["yes","Active"],["no","Inactive"]])));
  }

  function field(title, name, value = "", attrs = "", full = false, help = "") {
    const id = `dialog-field-${name}`;
    return `<div class="form-field ${full ? "full" : ""}"><label for="${id}">${escape(title)}</label><input id="${id}" name="${name}" value="${escape(value)}" ${attrs}${help ? ` aria-describedby="${id}-help"` : ""}>${help ? `<small id="${id}-help">${escape(help)}</small>` : ""}</div>`;
  }

  function selectField(title, name, choices, value, full = false) {
    return `<div class="form-field ${full ? "full" : ""}"><label for="admin-field-${name}">${escape(title)}</label><select id="admin-field-${name}" name="${name}">${optionList(choices, value)}</select></div>`;
  }

  function checkField(title, name, checked) {
    return `<label class="form-field form-check"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}>${escape(title)}</label>`;
  }

  function drawDialog(title, inside, submitLabel, submit) {
    dialog.setAttribute("aria-labelledby", "dialog-title");
    dialog.innerHTML = `<form><div class="dialog-head"><h2 id="dialog-title">${escape(title)}</h2><button type="button" class="icon-button" data-close aria-label="Close">${icon("close", 19)}</button></div><div class="dialog-body">${inside}<p class="error-text" role="alert"></p></div><div class="dialog-actions"><button class="button-subtle" type="button" data-close>${submit ? "Cancel" : "Close"}</button>${submit ? `<button class="button button-accent" type="submit">${escape(submitLabel)}</button>` : ""}</div></form>`;
    dialog.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
    const form = dialog.querySelector("form");
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!submit) return;
      const error = form.querySelector(".error-text");
      error.textContent = "";
      try {
        const result = submit(new FormData(form));
        if (result?.error) {
          error.textContent = result.error;
          return;
        }
        const origin = dialogOrigin;
        dialog.close();
        render();
        restoreActionFocus(origin);
        showToast(result?.message || "Changes saved.");
      } catch (problem) {
        console.error(problem);
        error.textContent = "Changes could not be saved. Try again.";
      }
    });
    if (!dialog.open) dialog.showModal();
  }

  function restoreActionFocus(origin) {
    if (!origin) return;
    const button = [...main.querySelectorAll("[data-admin-action]")].find(node => node.dataset.adminAction === origin.adminAction && node.dataset.id === origin.id);
    (button || main).focus({preventScroll:true});
  }

  function editOrder(id) {
    const order = allOrders().find(record => record.id === id);
    if (!order) return;
    const contact = typeof order.address === "object" && order.address !== null ? Object.values(order.address).filter(Boolean).join(", ") : order.address;
    const history = order.statusHistory || [];
    const lines = (order.items || []).map(item => `<li><div><strong>${escape(item.name)}</strong> <span>${escape([item.size, item.color, `Qty ${item.qty}`].filter(Boolean).join(" · "))}</span></div><strong>${money(item.qty * item.price)}</strong></li>`).join("");
    const summary = `<div class="detail-section"><p><strong>${escape(order.customer)}</strong><br>${escape(order.email)}${contact ? `<br>${escape(contact)}` : ""}</p><p>Placed ${escape(dateText(order))}</p><ul class="order-lines">${lines}<li><span>Total</span><strong>${money(order.total)}</strong></li></ul></div>`;
    const statusForm = `<div class="form-grid">${selectField("Order status", "status", options.status, order.status)}${selectField("Payment", "payment", options.payment, order.payment)}${selectField("Fulfillment", "fulfillment", options.fulfillment, order.fulfillment, true)}</div>`;
    const events = history.length ? `<div class="detail-section"><h3>Activity</h3>${history.slice(-5).reverse().map(event => `<p>${escape(dateText(event))} · ${escape(event.label)}</p>`).join("")}</div>` : "";
    drawDialog(`Order #${order.id}`, summary + statusForm + events, "Save order", form => {
      const orders = allOrders();
      const current = orders.find(record => record.id === id);
      if (!current) return {error:"This order was removed. Refresh the list and try again."};
      const changes = Object.fromEntries([...form].filter(([key, value]) => options[key]?.includes(value) && str(current[key]) !== value));
      if (!Object.keys(changes).length) return {message:"Order unchanged."};
      const label = Object.entries(changes).map(([key,value]) => `${key[0].toUpperCase() + key.slice(1)} updated to ${value.toLowerCase()}`).join(" · ");
      const updated = {...current, ...changes, statusHistory:[...(current.statusHistory || []), {date:new Date().toISOString(), label}]};
      AF.setOrders(orders.map(record => record.id === id ? updated : record));
      return {message:`Order #${id} updated.`};
    });
  }

  function nameToSku(raw, products) {
    const stem = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "new-product";
    let sku = stem;
    let suffix = 1;
    while (products.some(product => product.id === sku)) {
      suffix += 1;
      sku = `${stem}-${suffix}`;
    }
    return sku;
  }

  function editProduct(id) {
    const item = AF.catalog().find(record => record.id === id);
    if (id && !item) return;
    const defaults = item || {name:"", category:"", price:"", oldPrice:"", image:"", alt:"", colors:[{name:"Black", hex:"#1b1b16"}], sizes:["S", "M", "L"], description:"", details:[], stock:{}, isNew:true, featured:false};
    const categoryOptions = [...new Set(AF.catalog().map(product => product.category))];
    const datalist = `<datalist id="catalog-categories">${categoryOptions.map(category => `<option value="${escape(category)}"></option>`).join("")}</datalist>`;
    const productForm = `<div class="form-grid">${field("Product name", "name", defaults.name, 'maxlength="100" required')}${field("Category", "category", defaults.category, 'maxlength="60" list="catalog-categories" required')}${datalist}${field("Price (USD)", "price", defaults.price, 'type="number" min="0" max="99999" step="0.01" required')}${field("Original price (USD)", "oldPrice", defaults.oldPrice, 'type="number" min="0" max="99999" step="0.01"')}${selectField("Storefront status", "status", ["Active", "Draft", "Archived"], item ? productStatus(item) : "Draft", true)}${field("Product image", "image", defaults.image, 'maxlength="350"', true, "Use an existing assets/ path or an HTTPS image URL.")}${field("Image description", "alt", defaults.alt, 'maxlength="140"', true)}${field("Sizes", "sizes", (defaults.sizes || []).join(", "), 'maxlength="90" required', true, "Separate values with commas. New sizes start with zero stock.")}${field("Colors", "colors", (defaults.colors || []).map(color => `${color.name} / ${color.hex}`).join(", "), 'maxlength="200" required', true, "Use name / hex, separated by commas. For example, Black / #1b1b16.")}<label class="form-field full">Description<textarea name="description" maxlength="600">${escape(defaults.description)}</textarea></label><div class="form-field full"><label for="product-details">Details</label><textarea id="product-details" name="details" maxlength="600" aria-describedby="product-details-help">${escape((defaults.details || []).join("\n"))}</textarea><small id="product-details-help">Enter one detail per line.</small></div>${checkField("New arrival", "isNew", defaults.isNew)}${checkField("Featured", "featured", defaults.featured)}</div>`;
    drawDialog(item ? `Edit ${item.name}` : "Add product", productForm, item ? "Save product" : "Create product", form => {
      const products = AF.catalog();
      const current = products.find(record => record.id === id);
      const name = str(form.get("name")).trim();
      const category = str(form.get("category")).trim();
      const sizes = [...new Set(str(form.get("sizes")).split(",").map(size => size.trim()).filter(Boolean))];
      const colors = str(form.get("colors")).split(",").map(record => record.split("/").map(token => token.trim()));
      const image = str(form.get("image")).trim();
      const alt = str(form.get("alt")).trim();
      const status = str(form.get("status"));
      const price = toNum(form.get("price"));
      const oldPrice = toNum(form.get("oldPrice"));
      if (!name || !category || !sizes.length) return {error:"Enter a product name, category and at least one size."};
      if (image && !safeImage(image)) return {error:"Use an assets/ path or an HTTP(S) URL for the product image."};
      if (oldPrice && oldPrice <= price) return {error:"The original price must be higher than the selling price."};
      if (colors.some(([label, hex, extra]) => !label || !/^#[0-9a-f]{6}$/i.test(hex) || extra !== undefined)) return {error:"Enter each color as a name and six-digit hex code."};
      if (new Set(colors.map(([label]) => lower(label))).size !== colors.length) return {error:"Enter a different name for each color."};
      if (id && !current) return {error:"This product was removed. Refresh the list and try again."};
      const existingGallery = (current?.gallery || []).slice(1).filter(entry => entry.image !== current.image);
      const gallery = image ? [{image, alt:alt || name}, ...existingGallery, {image, alt:`Close-up of ${name}`, detail:true}] : existingGallery;
      const updated = {
        ...current, id:current?.id || nameToSku(name, products), name, category, price, oldPrice, image, gallery,
        alt, sizes, colors:colors.map(([label, hex]) => ({name:label, hex})), status, archived:status === "Archived", hidden:status === "Draft",
        description:str(form.get("description")).trim(), details:str(form.get("details")).split("\n").map(detail => detail.trim()).filter(Boolean),
        stock:Object.fromEntries(sizes.map(size => [size, toNum(current?.stock?.[size])])),
        isNew:form.has("isNew"), featured:form.has("featured")
      };
      AF.setCatalog(current ? products.map(product => product.id === id ? updated : product) : [...products, updated]);
      return {message:`${name} ${current ? "updated" : "added to the catalog"}.`};
    });
  }

  function editStock(id) {
    const item = AF.catalog().find(record => record.id === id);
    if (!item) return;
    const sizes = item.sizes || [];
    const stockInputs = sizes.map((size, index) => field(size, `stock${index}`, toNum(item.stock?.[size]), 'type="number" min="0" max="99999" step="1" required')).join("");
    drawDialog(`Stock · ${item.name}`, `<p>Set available units for each size.</p><div class="form-grid">${stockInputs}</div>`, "Update inventory", form => {
      const product = AF.catalog().find(record => record.id === id);
      if (!product) return {error:"The product could not be found."};
      if (JSON.stringify(product.sizes) !== JSON.stringify(sizes)) return {error:"The size list has changed. Close this window and reopen it to see the current sizes."};
      const stock = Object.fromEntries(sizes.map((size, index) => [size, toNum(form.get(`stock${index}`))]));
      AF.setCatalog(AF.catalog().map(record => record.id === id ? {...record, stock} : record));
      return {message:`Inventory updated for ${item.name}.`};
    });
  }

  function viewCustomer(id) {
    const person = customerList(allOrders()).find(record => record.id === id);
    if (!person) return;
    const rows = person.orders.map(order => [escape(`#${order.id}`), escape(dateText(order)), pill(order.payment), money(order.total)]);
    drawDialog(person.name || initials(person.email), `<div class="detail-section"><p>${escape(person.email)}<br>Paid total ${money(person.total)}</p></div>${table(["Order", "Date", "Payment", "Total"], rows, "No orders found.")}`);
  }

  function editDiscount(code) {
    const coupon = allCoupons().find(record => record.code === code);
    if (code && !coupon) return;
    const defaults = coupon || {code:"", type:"percent", value:10, active:true};
    const fields = `<div class="form-grid">${field("Code", "code", defaults.code, 'required minlength="3" maxlength="24" pattern="[A-Za-z0-9_\\-]{3,24}"', true, "Use 3–24 letters, digits, hyphens or underscores.")}${selectField("Type", "type", [["percent","Percentage"], ["fixed","Fixed amount (USD)"]], defaults.type)}${field("Value", "value", defaults.value, 'type="number" min="0.01" step="0.01" max="99999" required')}${checkField("Active at checkout", "active", defaults.active)}</div>`;
    drawDialog(coupon ? `Edit ${coupon.code}` : "Add discount", fields, coupon ? "Save discount" : "Create discount", form => {
      const coupons = allCoupons();
      const key = str(form.get("code")).trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,24}$/.test(key)) return {error:"Enter a valid discount code."};
      if (coupons.some(record => record.code === key && key !== code)) return {error:"A discount with this code already exists."};
      const type = form.get("type");
      const value = toNum(form.get("value"));
      if (!value || (type === "percent" && value > 100)) return {error:"Enter a positive value. Percentage discounts can be at most 100%."};
      const updated = {code:key, type, value, active:form.has("active")};
      AF.write("discounts", coupon ? coupons.map(record => record.code === code ? updated : record) : [...coupons, updated]);
      return {message:`Discount ${key} ${coupon ? "updated" : "created"}.`};
    });
  }

  function exportOrders() {
    const cell = value => {
      const original = str(value);
      const safe = /^[=+@\-\s]/.test(original) ? `'${original}` : original;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = allOrders().filter(order => matchesQuery(order.id, order.customer, order.email, ...(order.items || []).map(item => item.name)) && Object.keys(options).every(key => !state.query.has(key) || lower(order[key]) === lower(state.query.get(key))));
    if (!rows.length) {
      showToast("There are no matching orders to export.");
      return;
    }
    const columns = ["id", "date", "customer", "email", "status", "payment", "fulfillment", "subtotal", "discount", "shipping", "total"];
    const csv = [columns.join(","), ...rows.map(order => columns.map(key => cell(order[key])).join(","))].join("\r\n");
    const href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a");
    link.href = href;
    link.download = "afterform-orders.csv";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    showToast(`Exported ${rows.length} orders.`);
  }

  function render() {
    nav.querySelectorAll("a").forEach(link => {
      if (link.hash === `#${state.route}`) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const pageName = pages[state.route].name;
    document.querySelector("#admin-crumb").textContent = pageName;
    document.title = `${pageName} · AFTERFORM Store desk`;
    const orders = allOrders();
    const catalog = AF.catalog();
    const candidates = {
      overview:() => renderDashboard(orders, catalog, false),
      analytics:() => renderDashboard(orders, catalog, true),
      orders:() => renderOrders(orders), products:() => renderProducts(catalog),
      inventory:() => renderProducts(catalog, true), customers:() => renderCustomers(orders), discounts:renderDiscounts
    };
    main.innerHTML = candidates[state.route]();
    if (state.chartPin !== null) setChartReadout(main.querySelector(`[data-point="${state.chartPin}"]`));
  }

  function readRoute(focus = false) {
    const [route = "overview", params = ""] = location.hash.slice(1).split("?");
    if (route === "admin-main") return;
    state.route = Object.hasOwn(pages, route) ? route : "overview";
    state.query = new URLSearchParams(params);
    state.tablePage = 1;
    state.chartPin = null;
    toggleRail(false);
    render();
    if (focus) {
      main.focus({preventScroll:true});
      window.scrollTo({top:0, behavior:"instant"});
    }
  }

  function updateQuery(name, value) {
    const query = new URLSearchParams(state.query);
    if (value) query.set(name, value);
    else query.delete(name);
    const hash = queryLink(state.route, query.size ? query : null);
    if (location.hash !== hash) location.hash = hash;
  }

  function setChartReadout(point) {
    const output = main.querySelector(".chart-readout");
    if (!output) return;
    output.querySelector("strong").textContent = point ? point.dataset.pointValue : output.dataset.total;
    output.querySelector("span").textContent = point ? `${point.dataset.label} · Previous ${point.dataset.compare}` : output.dataset.period;
  }

  function currentPin() {
    return state.chartPin === null ? null : main.querySelector(`[data-point="${state.chartPin}"]`);
  }

  function toggleRail(show) {
    rail.classList.toggle("rail-open", show);
    railToggle.setAttribute("aria-expanded", String(show));
    railToggle.setAttribute("aria-label", `${show ? "Close" : "Open"} store desk navigation`);
  }

  let dialogOrigin = null;
  let toastTimeout;

  function showToast(message) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3600);
  }

  nav.innerHTML = Object.entries(groups).map(([label, keys]) => `<div class="nav-group"><p class="nav-name">${label}</p>${keys.map(key => `<a class="nav-link" href="#${key}"><span aria-hidden="true">${icon(pages[key].icon)}</span>${pages[key].name}</a>`).join("")}</div>`).join("");
  document.querySelectorAll("[data-icon]").forEach(node => {node.innerHTML = icon(node.dataset.icon);});
  railToggle.addEventListener("click", () => {
    const show = !rail.classList.contains("rail-open");
    toggleRail(show);
    if (show) nav.querySelector('[aria-current="page"]')?.focus();
  });
  rail.addEventListener("click", event => {
    if (event.target.closest("a")?.hash === location.hash) toggleRail(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && rail.classList.contains("rail-open")) {
      toggleRail(false);
      railToggle.focus();
    }
  });
  document.querySelector(".skip-link").addEventListener("click", event => {
    event.preventDefault();
    main.focus();
  });

  main.addEventListener("click", event => {
    const point = event.target.closest("[data-point]");
    if (point) {
      const index = Number(point.dataset.point);
      state.chartPin = state.chartPin === index ? null : index;
      main.querySelectorAll("[data-point]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.point) === state.chartPin)));
      setChartReadout(currentPin());
      return;
    }
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    const {id, adminAction} = button.dataset;
    dialogOrigin = {id, adminAction};
    const actions = {
      order:() => editOrder(id), product:() => editProduct(id), "create-product":() => editProduct(), stock:() => editStock(id), customer:() => viewCustomer(id),
      discount:() => editDiscount(id), "create-discount":() => editDiscount(), "export-orders":exportOrders,
      "clear-filters":() => {location.hash = state.route;},
      next:() => {state.tablePage += 1; render(); restoreActionFocus(dialogOrigin);},
      previous:() => {state.tablePage -= 1; render(); restoreActionFocus(dialogOrigin);},
      "chart-mode":() => {state.chartMode = id; state.chartPin = null; render(); restoreActionFocus(dialogOrigin);}
    };
    actions[adminAction]?.();
  });
  main.addEventListener("pointerover", event => {
    const point = event.target.closest("[data-point]");
    if (point) setChartReadout(point);
  });
  main.addEventListener("pointerout", event => {
    if (event.target.closest("[data-point]")) setChartReadout(currentPin());
  });
  main.addEventListener("focusin", event => {
    const point = event.target.closest("[data-point]");
    if (point) setChartReadout(point);
  });
  main.addEventListener("focusout", event => {
    if (event.target.closest("[data-point]")) setChartReadout(currentPin());
  });
  main.addEventListener("change", event => {
    const {select:name} = event.target.dataset;
    if (!name) return;
    if (name === "range") {
      state.dateRange = Number(event.target.value);
      state.chartPin = null;
      render();
      main.querySelector('[data-select="range"]').focus({preventScroll:true});
      return;
    }
    if (name.startsWith("filter-")) updateQuery(name.slice(7), event.target.value);
  });
  main.addEventListener("submit", event => {
    if (event.target.id !== "table-search") return;
    event.preventDefault();
    updateQuery("q", str(new FormData(event.target).get("q")).trim());
  });
  window.addEventListener("hashchange", () => readRoute(true));
  window.addEventListener("storage", () => {if (!dialog.open) render();});
  readRoute();
})();
