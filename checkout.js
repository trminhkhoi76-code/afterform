(function () {
  "use strict";

  const { esc, money, icon, config } = window.AF;
  const state = { code: "", method: "standard", draft: {}, tracking: null, authEmail: "" };
  const US_STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

  function heading(title, detail, eyebrow) {
    return `<header class="flow-heading">
      ${eyebrow ? `<p class="flow-kicker">${eyebrow}</p>` : ""}
      <h1 tabindex="-1">${title}</h1>
      ${detail ? `<p class="flow-subtitle">${detail}</p>` : ""}
    </header>`;
  }

  function field(name, label, options = {}) {
    const { type = "text", autocomplete = "off", value = "", required = true, full = false, extra = "" } = options;
    return `<label class="flow-field ${full ? "flow-field-full" : ""}">
      <span>${label}</span>
      <input name="${name}" type="${type}" autocomplete="${autocomplete}" value="${esc(value)}" ${required ? "required" : ""} ${extra}>
    </label>`;
  }

  function message(id) {
    return `<p id="${id}" class="flow-feedback" role="status" hidden></p>`;
  }

  function feedback(target, value, error = true) {
    if (!target) return;
    target.textContent = value;
    target.classList.toggle("flow-feedback-ok", !error);
    target.hidden = !value;
  }

  function empty(title, detail, iconName = "bag", link = "#/shop", label = "Explore the shop") {
    return `<section class="flow-page flow-empty">
      <span class="flow-empty-icon">${icon(iconName, 28)}</span>
      ${heading(title, detail)}
      <a class="flow-button flow-button-accent" href="${link}">${label}</a>
    </section>`;
  }

  function dateLabel(value) {
    const date = new Date(value);
    return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date) : value;
  }

  function details(item) {
    return [item.color, item.size].filter(Boolean).map(esc).join(" · ");
  }

  function rows(items, mode) {
    const editable = mode === "bag";
    return items.map((item, index) => {
      const stock = Number.isFinite(item.stock) ? item.stock : Infinity;
      const title = editable ? `<a href="#/product/${encodeURIComponent(item.id)}">${esc(item.name)}</a>` : esc(item.name);
      return `<li class="flow-line">
        <div class="flow-line-image">${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : icon("box", 22)}</div>
        <div class="flow-line-info">
          <h3>${title}</h3>
          <p>${details(item)}${!editable ? `<span class="flow-line-quantity">Qty ${item.qty}</span>` : ""}</p>
          ${editable ? `<div class="flow-quantity">
            <button type="button" data-line="${index}" data-quantity="-1" aria-label="Decrease quantity of ${esc(item.name)}" ${item.qty <= 1 ? "disabled" : ""}>${icon("minus", 14)}</button>
            <span aria-label="Quantity">${item.qty}</span>
            <button type="button" data-line="${index}" data-quantity="1" aria-label="Increase quantity of ${esc(item.name)}" ${item.qty >= stock ? "disabled" : ""}>${icon("plus", 14)}</button>
          </div>` : ""}
          ${editable && item.qty > stock ? '<small class="flow-stock-warning">This item no longer has enough stock.</small>' : ""}
        </div>
        <div class="flow-line-end"><strong>${money(item.price * item.qty)}</strong>
          ${editable ? `<button class="flow-link flow-remove" type="button" data-line="${index}" data-quantity="remove">Remove<span class="flow-sr"> ${esc(item.name)}</span></button>` : ""}
        </div>
      </li>`;
    }).join("");
  }

  function totalsMarkup(totals) {
    return `<dl class="flow-totals">
      <div><dt>Subtotal</dt><dd>${money(totals.subtotal)}</dd></div>
      ${totals.discount ? `<div><dt>Discount</dt><dd>−${money(totals.discount)}</dd></div>` : ""}
      <div><dt>Shipping</dt><dd>${totals.shipping ? money(totals.shipping) : "Free"}</dd></div>
      <div class="flow-total"><dt>Total <span>USD</span></dt><dd>${money(totals.total)}</dd></div>
    </dl>`;
  }

  function promoForm() {
    return `<form id="flow-promo" class="flow-promo">
      <label for="flow-code">Promo code</label>
      <div class="flow-inline-field">
        <input id="flow-code" name="code" type="text" placeholder="Enter code" value="${esc(state.code)}" autocomplete="off">
        <button type="submit" class="flow-button flow-button-outline">Apply</button>
      </div>
      ${state.code ? `<p class="flow-code-active">${esc(state.code)} ${AF.coupon(state.code) ? "applied." : "is no longer available."} <button type="button" class="flow-link" data-clear-code>Remove</button></p>` : ""}
      ${message("flow-promo-feedback")}
    </form>`;
  }

  function summary(items, stage) {
    const totals = AF.totals(items, state.code, state.method);
    const count = items.reduce((total, item) => total + item.qty, 0);
    return `<aside class="flow-summary" aria-label="Order summary">
      <header><h2>Order summary</h2><span>${count} ${count === 1 ? "item" : "items"}</span></header>
      ${stage === "checkout" ? `<ul class="flow-lines flow-lines-compact">${rows(items, "summary")}</ul>` : ""}
      ${promoForm()}
      <div id="flow-totals" aria-live="polite">${totalsMarkup(totals)}</div>
      ${stage === "bag" ? `<a href="#/checkout" class="flow-button flow-button-accent flow-button-wide">Continue to checkout</a>
        <p class="flow-note">${icon("truck", 18)} Free standard shipping on orders of ${money(config.shippingFree)} or more.</p>` : ""}
    </aside>`;
  }

  function bag() {
    const items = AF.cartItems();
    if (!items.length) return empty("Your bag is empty.", "Find something you’ll keep in rotation.");
    return `<div class="flow-page">
      <div class="flow-title-row">${heading("Your bag.", "", "THE SHOP")}<a href="#/shop" class="flow-link">Continue shopping</a></div>
      <div class="flow-layout">
        <section class="flow-bag-list" aria-label="Items in your bag"><ul class="flow-lines">${rows(items, "bag")}</ul></section>
        ${summary(items, "bag")}
      </div>
    </div>`;
  }

  function checkout() {
    const items = AF.cartItems();
    if (!items.length) return empty("Your bag is empty.", "Add an item to your bag to start checkout.");
    const session = AF.getSession();
    const draft = state.draft;
    const standard = AF.totals(items, state.code, "standard").shipping;
    const express = AF.totals(items, state.code, "express").shipping;
    return `<div class="flow-page flow-checkout">
      <nav class="flow-progress" aria-label="Checkout progress">
        <a href="#/bag">Bag</a>${icon("right", 14)}<span aria-current="step">Checkout</span>${icon("right", 14)}<span>Confirmation</span>
      </nav>
      <div class="flow-title-row">${heading("Checkout.", session ? "Your order details are all in one place." : "Checking out as a guest. You can create an account after ordering.")}</div>
      <div class="flow-layout">
        <form id="flow-checkout-form" class="flow-checkout-form">
          <fieldset class="flow-section">
            <legend>Contact</legend>
            ${!session ? '<a class="flow-link flow-contact-action" href="#/login?return=checkout">Sign in</a>' : ""}
            <div class="flow-form-grid">
              ${field("email", "Email address", { type: "email", autocomplete: "email", value: draft.email ?? session?.email, full: true })}
            </div>
          </fieldset>
          <fieldset class="flow-section">
            <legend>Shipping address</legend>
            <div class="flow-form-grid">
              ${field("name", "Full name", { autocomplete: "shipping name", value: draft.name ?? session?.name, full: true })}
              ${field("street", "Street address", { autocomplete: "shipping address-line1", value: draft.street, full: true })}
              ${field("unit", "Apartment, suite, etc. (optional)", { autocomplete: "shipping address-line2", value: draft.unit, required: false, full: true })}
              ${field("city", "City", { autocomplete: "shipping address-level2", value: draft.city })}
              <div class="flow-field"><label for="flow-state">State</label><select id="flow-state" name="state" required autocomplete="shipping address-level1"><option value="">Select a state</option>
              ${US_STATES.map(option => `<option ${draft.state === option ? "selected" : ""}>${option}</option>`).join("")}</select></div>
              ${field("zip", "ZIP code", { autocomplete: "shipping postal-code", value: draft.zip, extra: 'inputmode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" title="Enter a 5-digit ZIP code or ZIP+4"' })}
              <div class="flow-field"><label for="flow-country">Country</label><select id="flow-country" name="country" required autocomplete="shipping country-name"><option value="United States">United States</option></select></div>
            </div>
          </fieldset>
          <fieldset class="flow-section">
            <legend>Delivery</legend>
            <div class="flow-select-list">
              <label class="flow-option"><input type="radio" name="method" value="standard" ${state.method === "standard" ? "checked" : ""}><span><strong>Standard</strong><small>3–5 business days</small></span><b>${standard ? money(standard) : "Free"}</b></label>
              <label class="flow-option"><input type="radio" name="method" value="express" ${state.method === "express" ? "checked" : ""}><span><strong>Express</strong><small>1–2 business days</small></span><b>${money(express)}</b></label>
            </div>
          </fieldset>
          <fieldset class="flow-section">
            <legend>Payment</legend>
            <div class="flow-test-payment">${icon("lock", 21)}<div><strong>Demo payment</strong><p>Completes a test order without charging you.</p></div></div>
          </fieldset>
        </form>
        ${summary(items, "checkout")}
        <div class="flow-checkout-submit">
          ${message("flow-checkout-feedback")}
          <button type="submit" form="flow-checkout-form" class="flow-button flow-button-accent flow-button-wide">Place demo order <span data-submit-total>${money(AF.totals(items, state.code, state.method).total)}</span></button>
        </div>
      </div>
    </div>`;
  }

  function statusClass(status) {
    return /cancel|refund/i.test(status) ? " flow-tag-negative" : /paid|complete|deliver|fulfill|shipped/i.test(status) && !/unfulfilled/i.test(status) ? " flow-tag-positive" : "";
  }

  function orderBody(order) {
    const address = order.address;
    return `<div class="flow-order-paper">
      <header><div><p class="flow-kicker">ORDER</p><h2>${esc(order.id)}</h2></div><time datetime="${esc(order.date)}">${esc(dateLabel(order.date))}</time></header>
      <ul class="flow-lines flow-lines-compact">${rows(order.items, "summary")}</ul>
      ${totalsMarkup(order)}
      ${address?.street ? `<div class="flow-order-address"><strong>Shipping address</strong><p>${esc(address.street)}${address.unit ? `, ${esc(address.unit)}` : ""}<br>${esc(address.city)}, ${esc(address.state)} ${esc(address.zip)}<br>${esc(address.country)}</p></div>` : ""}
    </div>`;
  }

  function customerOwns(order, email) {
    return email && order.email?.trim().toLowerCase() === email.trim().toLowerCase();
  }

  function confirmation(route) {
    const receipt = AF.read("receipt", null);
    const order = AF.getOrders().find(item => item.id === route.parts[0] && (
      customerOwns(item, AF.getSession()?.email) || (receipt?.id === item.id && customerOwns(item, receipt.email))
    ));
    if (!order) return empty("Order unavailable.", "Find your order using its number and checkout email.", "box", "#/track", "Track an order");
    return `<section class="flow-page flow-confirm">
      <div class="flow-confirm-copy">
        <span class="flow-empty-icon">${icon("check", 29)}</span>
        ${heading("You’re all set.", `Order ${esc(order.id)} has been placed.`, "ORDER CONFIRMED")}
        <p class="flow-confirm-detail">Use your order number and ${esc(order.email)} to check your delivery status.</p>
        <div class="flow-confirm-actions">
          <a class="flow-button flow-button-accent" href="#/track">Track order</a>
          <a class="flow-button flow-button-outline" href="#/shop">Continue shopping</a>
        </div>
        ${AF.getSession() ? "" : '<p class="flow-after-order"><a href="#/register" class="flow-link">Create an account</a> with your checkout email to keep your orders together.</p>'}
      </div>
      ${orderBody(order)}
    </section>`;
  }

  function auth(route) {
    const isRegister = route.page === "register";
    const returnTo = authReturn(route);
    const switchHref = `#/${isRegister ? "login" : "register"}${returnTo === "/checkout" ? "?return=checkout" : ""}`;
    const session = AF.getSession();
    if (session) {
      return empty("You’re signed in.", `You’re shopping as ${esc(session.email)}.`, "user", `#${returnTo}`, returnTo === "/checkout" ? "Return to checkout" : "Open your account");
    }
    return `<div class="flow-page flow-auth">
      <div class="flow-auth-image"><img src="${esc(config.hero)}" alt="AFTERFORM campaign portrait in an amber studio"></div>
      <section class="flow-auth-panel">
        ${heading(isRegister ? "Make it yours." : "Welcome back.", isRegister ? "Save your details and keep your orders together." : "Sign in to see your orders and account details.", isRegister ? "CREATE AN ACCOUNT" : "YOUR ACCOUNT")}
        <form id="flow-auth-form">
          ${isRegister ? field("name", "Full name", { autocomplete: "name" }) : ""}
          ${field("email", "Email address", { type: "email", autocomplete: "username", value: state.authEmail })}
          <div class="flow-password-wrap">
            ${field("password", "Password", { type: "password", autocomplete: isRegister ? "new-password" : "current-password", extra: isRegister ? 'minlength="8" aria-describedby="flow-password-help"' : "" })}
            <button type="button" class="flow-link flow-show-password" data-password-toggle aria-label="Show password">Show</button>
          </div>
          ${isRegister ? '<p id="flow-password-help" class="flow-help">Use at least 8 characters. Use a test password for this prototype.</p>' : ""}
          ${message("flow-auth-feedback")}
          <button type="submit" class="flow-button flow-button-accent flow-button-wide">${isRegister ? "Create account" : "Sign in"}</button>
          ${!isRegister ? '<button type="button" data-demo-login class="flow-demo-login">Fill demo credentials</button>' : ""}
        </form>
        <p class="flow-auth-switch">${isRegister ? "Already have an account?" : "New to AFTERFORM?"} <a href="${switchHref}" class="flow-link">${isRegister ? "Sign in" : "Create an account"}</a></p>
      </section>
    </div>`;
  }

  function authReturn(route) {
    const requested = route.query instanceof URLSearchParams ? route.query.get("return") : route.query?.return;
    return requested === "checkout" ? "/checkout" : "/account";
  }

  function account(route) {
    const session = AF.getSession();
    if (!session) return empty("Your account.", "Sign in to see previous orders and account details.", "user", "#/login", "Sign in");
    const orders = AF.getOrders().filter(order => customerOwns(order, session.email));
    const selected = route.parts[0] === "order" ? orders.find(order => order.id === route.parts[1]) : null;
    return `<div class="flow-page">
      <div class="flow-title-row">${heading(`Hello, ${esc(session.name.split(" ")[0])}.`, "", "YOUR ACCOUNT")}
        <button type="button" class="flow-link" data-sign-out>Sign out</button></div>
      <div class="flow-layout flow-account-layout">
        <aside class="flow-account-meta"><h2>Profile</h2><p>${esc(session.name)}</p><p>${esc(session.email)}</p><a class="flow-link" href="#/track">Track an order</a></aside>
        <section class="flow-account-orders">
          ${selected ? `<a class="flow-link flow-order-back" href="#/account">All orders</a>${orderBody(selected)}${orderProgress(selected)}`
            : `<h2>Your orders</h2>${orders.length ? `<ul class="flow-order-list">${orders.map(order => `<li><a href="#/account/order/${encodeURIComponent(order.id)}">
              <span><strong>${esc(order.id)}</strong><time datetime="${esc(order.date)}">${esc(dateLabel(order.date))}</time></span>
              <span class="flow-tag${statusClass(order.status)}">${esc(order.status)}</span><strong>${money(order.total)}</strong>${icon("right", 17)}
            </a></li>`).join("")}</ul>` : '<div class="flow-account-empty"><p>No orders yet.</p><a class="flow-link" href="#/shop">Explore the shop</a></div>'}`}
        </section>
      </div>
    </div>`;
  }

  function orderProgress(order) {
    const milestones = ["Order placed", "Packed", "Shipped", "Delivered"];
    const stage = ["Unfulfilled", "Packed", "Shipped", "Delivered"].indexOf(order.fulfillment);
    const cancelled = /cancel/i.test(order.status);
    return `<section class="flow-order-progress" aria-label="Order progress">
      <div class="flow-status-tags">
        <span class="flow-tag${statusClass(order.status)}">${esc(order.status)}</span>
        <span class="flow-tag${statusClass(order.payment)}">${esc(order.payment)}</span>
      </div>
      ${cancelled ? "<p>This order was cancelled.</p>" : `<ol>${milestones.map((milestone, index) => `<li class="${index <= Math.max(0, stage) ? "is-reached" : ""}" ${index === Math.max(0, stage) ? 'aria-current="step"' : ""}><span></span>${milestone}</li>`).join("")}</ol>`}
    </section>`;
  }

  function trackingResult() {
    if (!state.tracking) return "";
    const order = AF.getOrders().find(item => item.id.toUpperCase() === state.tracking.id && customerOwns(item, state.tracking.email));
    if (!order) return '<p class="flow-feedback" role="status">We couldn’t find an order with that number and email. Check the details and try again.</p>';
    return `<div class="flow-track-card" tabindex="-1">${orderProgress(order)}${orderBody(order)}</div>`;
  }

  function track() {
    return `<div class="flow-page">
      ${heading("Track your order.", "Enter your order number and the email used at checkout.")}
      <div class="flow-track-layout">
        <form class="flow-track-form" id="flow-track-form">
          ${field("id", "Order number", { value: state.tracking?.id, extra: 'placeholder="AF-1001" autocapitalize="characters"' })}
          ${field("email", "Checkout email", { type: "email", autocomplete: "email", value: state.tracking?.email || AF.getSession()?.email })}
          <button type="submit" class="flow-button flow-button-accent flow-button-wide">Find order</button>
        </form>
        <div id="flow-track-result" aria-live="polite">${trackingResult()}</div>
      </div>
    </div>`;
  }

  const pages = { bag, checkout, confirmation, login: auth, register: auth, account, track };

  function setMethod(main, method) {
    state.method = method;
    const totals = AF.totals(AF.cartItems(), state.code, method);
    main.querySelector("#flow-totals").innerHTML = totalsMarkup(totals);
    main.querySelector("[data-submit-total]").textContent = money(totals.total);
  }

  function enterCoupon(main, value) {
    const target = main.querySelector("#flow-promo-feedback");
    const code = value.trim().toUpperCase();
    if (!code || !AF.coupon(code)?.active) {
      feedback(target, "That promo code isn’t available. Check the code and try again.");
      return;
    }
    state.code = code;
    AFUI.refresh();
    document.querySelector("#flow-code")?.focus();
    AFUI.toast(`${code} applied.`);
  }

  function changeLine(index, delta) {
    const item = AF.cartItems()[index];
    if (!item) return;
    const qty = delta === "remove" ? 0 : delta === "-1" ? Math.min(item.qty - 1, item.stock) : item.qty + 1;
    const result = AF.updateCart(item.id, item.size, item.color, qty);
    if (!result.ok) {
      AFUI.toast(result.error || "That’s all we have in stock.");
      return;
    }
    AFUI.refresh();
    const replacement = document.querySelector(`#main [data-line="${index}"][data-quantity="${delta}"]:not(:disabled)`);
    (replacement || document.querySelector("#main h1"))?.focus();
    AFUI.toast(qty ? "Bag updated." : "Item removed from bag.");
  }

  function bindCheckout(main) {
    const form = main.querySelector("#flow-checkout-form");
    if (!form) return;
    const saveDraft = () => {
      state.draft = Object.fromEntries(new FormData(form));
    };
    form.addEventListener("input", saveDraft);
    form.addEventListener("change", event => {
      saveDraft();
      if (event.target.name === "method") setMethod(main, event.target.value);
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      saveDraft();
      const { email, name, street, unit, city, state: region, zip, country, method } = state.draft;
      const target = main.querySelector("#flow-checkout-feedback");
      if (![email, name, street, city, region, zip, country].every(value => value?.trim())) {
        feedback(target, "Complete all required contact and shipping fields.");
        return;
      }
      const result = AF.placeOrder({
        contact: { name: name.trim(), email: email.trim() },
        address: { street: street.trim(), unit: unit.trim(), city: city.trim(), state: region, zip, country },
        method,
        code: state.code
      });
      if (!result.ok) {
        feedback(target, result.error || "We couldn’t place your order. Review your bag and try again.");
        return;
      }
      AF.write("receipt", { id: result.order.id, email: result.order.email });
      state.authEmail = result.order.email;
      state.draft = {};
      state.code = "";
      state.method = "standard";
      state.tracking = { id: result.order.id.toUpperCase(), email: result.order.email };
      AFUI.go(`/confirmation/${encodeURIComponent(result.order.id)}`);
    });
  }

  function bindAuth(main, route) {
    const form = main.querySelector("#flow-auth-form");
    if (!form) return;
    const toggle = form.querySelector("[data-password-toggle]");
    toggle.addEventListener("click", () => {
      const reveal = form.elements.password.type === "password";
      form.elements.password.type = reveal ? "text" : "password";
      toggle.textContent = reveal ? "Hide" : "Show";
      toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });
    form.querySelector("[data-demo-login]")?.addEventListener("click", () => {
      form.elements.email.value = config.demoEmail;
      form.elements.password.value = config.demoPassword;
      form.elements.email.focus();
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(form));
      state.authEmail = fields.email.trim();
      if (route.page === "register" && !fields.name.trim()) {
        feedback(main.querySelector("#flow-auth-feedback"), "Enter your name to create an account.");
        form.elements.name.focus();
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const result = route.page === "register"
          ? await AF.register({ name: fields.name.trim(), email: state.authEmail, password: fields.password })
          : await AF.signIn(state.authEmail, fields.password);
        if (result.ok) {
          AFUI.go(authReturn(route));
        } else {
          feedback(main.querySelector("#flow-auth-feedback"), result.error || "Check your details and try again.");
        }
      } catch {
        feedback(main.querySelector("#flow-auth-feedback"), "Your account couldn’t be opened. Please try again.");
      } finally {
        submit.disabled = false;
      }
    });
  }

  function bind(route) {
    const main = document.querySelector("#main");
    main.querySelectorAll("[data-quantity]").forEach(button => button.addEventListener("click", () => changeLine(Number(button.dataset.line), button.dataset.quantity)));
    main.querySelector("#flow-promo")?.addEventListener("submit", event => {
      event.preventDefault();
      enterCoupon(main, new FormData(event.target).get("code"));
    });
    main.querySelector("[data-clear-code]")?.addEventListener("click", () => {
      state.code = "";
      AFUI.refresh();
      document.querySelector("#flow-code")?.focus();
      AFUI.toast("Promo code removed.");
    });
    main.querySelector("[data-sign-out]")?.addEventListener("click", () => {
      AF.signOut();
      state.authEmail = "";
      state.tracking = null;
      state.draft = {};
      AFUI.go("/login");
      AFUI.toast("Signed out.");
    });
    main.querySelector("#flow-track-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(event.target));
      state.tracking = { id: fields.id.trim().replace(/^#/, "").replace(/[–—]/g, "-").toUpperCase(), email: fields.email.trim() };
      const result = main.querySelector("#flow-track-result");
      result.innerHTML = trackingResult();
      result.querySelector(".flow-track-card")?.focus();
    });
    bindCheckout(main);
    bindAuth(main, route);
  }

  window.AFCheckout = { render: route => pages[route.page]?.(route), bind };
})();
