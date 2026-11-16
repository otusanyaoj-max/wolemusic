/* Wolemusic — shared script.
   Shop data (products, categories, prices, delivery, contact) comes from the backend
   (WM_API in catalog.js). The browser keeps the last copy, so pages open instantly;
   on a first visit the page waits for the backend (it may take ~1 minute to wake up). */
const API = String(window.WM_API || "").replace(/\/+$/, "");
const apiUrl = (p) => (API ? API + "/" : "") + String(p).replace(/^\//, "");
let CATALOG, WA_NUMBER, SHOP, DELIVERY, CATEGORIES, PRODUCTS, DEAL, DETAILS;
function applyCatalog(c) {
  CATALOG = window.CATALOG = { ...window.CATALOG, ...c };
  ({ whatsapp: WA_NUMBER, shop: SHOP, delivery: DELIVERY, categories: CATEGORIES, products: PRODUCTS, deal: DEAL } = CATALOG);
  DETAILS = Object.fromEntries(PRODUCTS.map((p) => [p.id, [p.summary, p.features]]));
}
applyCatalog({});

const ICONS = {
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  guitar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m20 4-6.5 6.5"/><path d="m18 2 4 4"/><path d="M11.5 9.5c-1.6-1-3.9-.8-5.3.6-1 1-1 2.1-1.6 2.7-.8.8-2.3.7-3 1.4-1.4 1.4.1 4.8 2.4 7.1s5.7 3.8 7.1 2.4c.7-.7.6-2.2 1.4-3 .6-.6 1.7-.6 2.7-1.6 1.4-1.4 1.6-3.7.6-5.3"/><circle cx="9" cy="15" r="1.5"/></svg>',
  keys: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v7M10 6v7M14 6v7M18 6v7M6 13v5M10 13v5M14 13v5M18 13v5"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><circle cx="12" cy="6.5" r="1.2"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></svg>',
  headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>',
  chair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10l-1 9H8z"/><path d="M5 12h14v3H5zM12 15v4M8 22l4-3 4 3"/></svg>',
  smartphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M1 20h22"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  badge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
};

// Photos: Wole's uploads are full links (Cloudflare R2); the samples are Unsplash photo ids.
const photo = (id, w = 800) => /^(https?:\/)?\//.test(id || "") ? id
  : `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;
const naira = (n) => "₦" + n.toLocaleString("en-NG");
const catOf = (id) => CATEGORIES.find((c) => c.id === id) || { id, name: "", icon: "note", bg: "#eee", fg: "#555" };
const inStock = (p) => p.in_stock !== false;
const mapEmbed = () => `<iframe title="Wolemusic location" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
  src="https://maps.google.com/maps?q=${encodeURIComponent(SHOP.mapQuery)}&z=15&output=embed"></iframe>`;
const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

/* ---------- Cart (browser storage; real checkout comes with Paystack) ---------- */
const Cart = {
  key: "wm_cart",
  read() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; } },
  write(c) { try { localStorage.setItem(this.key, JSON.stringify(c)); } catch {} },
  add(id, qty = 1) { const c = this.read(); c[id] = Math.min(99, (c[id] || 0) + qty); this.write(c); this.render(); },
  set(id, qty) { const c = this.read(); if (qty > 0) c[id] = Math.min(99, qty); else delete c[id]; this.write(c); this.render(); },
  clear() { this.write({}); this.render(); },
  items() {
    return Object.entries(this.read())
      .map(([id, qty]) => ({ p: PRODUCTS.find((x) => x.id === +id), qty }))
      .filter((x) => x.p)
      .map((x) => ({ ...x, line: x.p.price * x.qty }));
  },
  subtotal() { return this.items().reduce((a, x) => a + x.line, 0); },
  count() { return this.items().reduce((a, x) => a + x.qty, 0); },
  render() { document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = this.count())); },
};

/* ---------- Shared header / footer ---------- */
function renderChrome(active) {
  const links = [["index.html", "Home"], ["shop.html", "Shop"], ["about.html", "About"], ["contact.html", "Contact"]];
  const LOGO = `<span class="logo-mark">${ICONS.note}</span><span class="logo-text">WOLE<b>MUSIC</b></span>`;
  document.getElementById("site-header").innerHTML = `
    <div class="topbar"><div class="wrap">
      <span>Pay online with card, transfer or USSD<span class="hide-sm"> · Pickup at OAU or delivery</span></span>
      <span class="hide-sm">Call / WhatsApp: <a href="${waLink("Hello Wolemusic")}">${SHOP.phone}</a></span>
    </div></div>
    <header class="header"><div class="wrap">
      <a class="logo" href="index.html">${LOGO}</a>
      <nav class="nav" id="nav">
        ${links.map(([h, t]) => `<a href="${h}" class="${t === active ? "active" : ""}">${t}</a>`).join("")}
      </nav>
      <div class="header-actions">
        <a class="btn btn-wa btn-sm" href="${waLink("Hello Wolemusic, I want to make an enquiry")}">${ICONS.wa} WhatsApp</a>
        <a class="cart-btn" href="cart.html" aria-label="Cart">${ICONS.cart}<span class="cart-count">0</span></a>
        <button class="menu-btn" aria-label="Menu" onclick="document.getElementById('nav').classList.toggle('open')">${ICONS.menu}</button>
      </div>
    </div></header>`;

  document.getElementById("site-footer").innerHTML = `
    <footer class="footer"><div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="logo" href="index.html">${LOGO}</a>
          <p>Laptops, gadgets, accessories and office furniture for students and workers. Based at OAU, Ile-Ife.</p>
        </div>
        <div><h4>Shop</h4><ul>${CATEGORIES.map((c) => `<li><a href="shop.html?cat=${c.id}">${c.name}</a></li>`).join("")}</ul></div>
        <div><h4>Help</h4><ul><li><a href="about.html#how">How to buy</a></li><li><a href="about.html#delivery">Delivery & pickup</a></li><li><a href="about.html#returns">Returns</a></li><li><a href="contact.html">Contact us</a></li></ul></div>
        <div><h4>Visit</h4><ul><li>${SHOP.address}</li><li>${SHOP.hours}</li><li>${SHOP.phone}</li></ul></div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Wolemusic. All rights reserved.</span>
        <span class="pay-logos">Secured by <span>Paystack</span><span>Visa</span><span>Mastercard</span><span>Verve</span></span>
      </div>
    </div></footer>
    <a class="wa-float" href="${waLink("Hello Wolemusic")}" aria-label="Chat on WhatsApp">${ICONS.wa}</a>
    <div class="toast" id="toast"></div>`;
  Cart.render();
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2000);
}

/* ---------- Product card ---------- */
function productCard(p) {
  const c = catOf(p.cat);
  const tagClass = p.tag === "Awoof deal" || p.tag === "Student deal" ? "badge deal" : "badge";
  return `
    <article class="card">
      <a class="card-img" href="product.html?id=${p.id}" style="background:${c.bg};color:${c.fg}">
        ${p.img ? `<img src="${photo(p.img, 600)}" alt="${p.name}" loading="lazy">` : ICONS[c.icon]}
        ${!inStock(p) ? `<span class="badge soldout">Sold out</span>` : p.tag ? `<span class="${tagClass}">${p.tag}</span>` : ""}
      </a>
      <div class="card-body">
        <span class="card-cat">${c.name}</span>
        <a class="card-title" href="product.html?id=${p.id}">${p.name}</a>
        <div class="price-row"><span class="price">${naira(p.price)}</span>${p.old ? `<span class="old-price">${naira(p.old)}</span>` : ""}</div>
        <div class="card-actions">
          ${inStock(p) ? `<button class="btn btn-add btn-sm" data-add="${p.id}">${ICONS.cart} Add to cart</button>`
            : `<button class="btn btn-add btn-sm" disabled>Sold out</button>`}
          <a class="btn btn-icon btn-sm" title="Ask on WhatsApp" href="${waLink(`Hello Wolemusic, is "${p.name}" (${naira(p.price)}) available?`)}">${ICONS.wa}</a>
        </div>
      </div>
    </article>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-add]");
  if (!b) return;
  const qtyEl = b.dataset.qtyFrom && document.querySelector(b.dataset.qtyFrom);
  Cart.add(b.dataset.add, qtyEl ? Math.max(1, +qtyEl.value || 1) : 1);
  b.classList.add("added");
  const label = b.innerHTML;
  b.innerHTML = "Added ✓";
  setTimeout(() => { b.classList.remove("added"); b.innerHTML = label; }, 1400);
  toast("Added to cart");
});

/* ---------- Student laptop deal: ₦30k off any laptop above ₦200k ----------
   TODO: confirm with Wole (per laptop? students only?). The server must
   recalculate this at payment time — never trust the browser's total. */

const qualifiesForDeal = (p) => p.cat === DEAL.cat && p.price > DEAL.min;
const dealDiscount = (items) => items.filter((x) => qualifiesForDeal(x.p)).reduce((a, x) => a + DEAL.off * x.qty, 0);

/* Quantity stepper: <div class="qty"> with − input + */
function qtyControl(id, value) {
  return `<div class="qty">
    <button type="button" aria-label="Decrease" data-step="-1" data-for="${id}">−</button>
    <input id="${id}" type="number" min="1" max="99" value="${value}" aria-label="Quantity" inputmode="numeric">
    <button type="button" aria-label="Increase" data-step="1" data-for="${id}">+</button>
  </div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-step]");
  if (!b) return;
  const input = document.getElementById(b.dataset.for);
  input.value = Math.min(99, Math.max(1, (+input.value || 1) + +b.dataset.step));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});

/* ---------- Loading the shop data from the backend ---------- */
const WM_CACHE = "wm_catalog_v1";
let wmReady = false, wmTyped = false;
const wmQueue = [];
/* Pages put their building code inside onReady(...): it runs once the shop data is here. */
function onReady(fn) { if (wmReady) fn(); else wmQueue.push(fn); }
document.addEventListener("input", () => (wmTyped = true));

function wmLoading(state) {
  let box = document.getElementById("wm-loading");
  if (!state) return box && box.remove();
  if (!box) { box = document.createElement("div"); box.id = "wm-loading"; box.className = "wm-loading"; document.body.prepend(box); }
  const wa = `https://wa.me/${CATALOG.whatsapp}?text=${encodeURIComponent("Hello Wolemusic")}`;
  box.innerHTML = state === "failed"
    ? `<div><h2>We couldn't load the shop right now</h2><p>Please check your connection and try again, or chat with us on WhatsApp.</p>
        <button class="btn btn-dark" onclick="location.reload()">Try again</button>
        <a class="btn btn-wa" href="${wa}">WhatsApp us</a></div>`
    : `<div><div class="wm-spin"></div><h2>Loading the shop…</h2>
        <p>${state === "slow" ? "Waking up our store. The first visit can take up to a minute." : "Just a moment."}</p></div>`;
}

(function boot() {
  if (window.WM_ADMIN) return; // the admin page loads its own data
  let cachedRaw = null, cached = null;
  try { cachedRaw = localStorage.getItem(WM_CACHE); cached = cachedRaw && JSON.parse(cachedRaw); } catch {}
  if (cached && Array.isArray(cached.products)) { applyCatalog(cached); wmReady = true; } // show the saved copy straight away
  else {
    setTimeout(() => !wmReady && wmLoading("wait"), 300);
    setTimeout(() => !wmReady && wmLoading("slow"), 5000);
  }
  // Pages where it's safe to reload when Wole has changed something since the saved copy.
  // (Checkout too, as long as the customer hasn't started typing: e.g. payments were just switched on.)
  const canReload = /(^\/$|\/(index|shop|product|cart|checkout|about|contact)(\.html)?$)/.test(location.pathname);

  async function load(attempt) {
    try {
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctl && setTimeout(() => ctl.abort(), 90000);
      const res = await fetch(apiUrl("api/catalog"), { cache: "no-store", signal: ctl && ctl.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Bad response");
      delete data.ok;
      const raw = JSON.stringify(data);
      try { localStorage.setItem(WM_CACHE, raw); } catch {}
      if (!wmReady) {
        applyCatalog(data); wmReady = true; wmLoading(null);
        wmQueue.splice(0).forEach((f) => f());
      } else if (raw !== cachedRaw && canReload && !wmTyped) {
        location.reload(); // show Wole's latest products/prices
      }
    } catch (e) {
      if (wmReady) return; // the saved copy is already showing
      if (attempt < 2) return load(attempt + 1);
      wmLoading("failed");
    }
  }
  load(1);
})();
