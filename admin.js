/* Wolemusic shop admin: Wole adds products, photos and categories, and sees orders.
   Everything is saved on the server (Neon database, photos in Cloudflare R2). */
(() => {
  const app = document.getElementById("app");
  const dlg = document.getElementById("dlg");
  const form = document.getElementById("dlg-form");
  document.getElementById("logo-mark").innerHTML = ICONS.note;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const thumb = (img) => (img ? `style="background-image:url('${esc(photo(img, 200))}')"` : "");
  const COLORS = [
    ["Amber", "#fdeccf", "#b86a0c"], ["Blue", "#e3e7f5", "#2f3a6b"], ["Green", "#e4f4ea", "#1c7a43"],
    ["Red", "#f6e3e1", "#a23b2f"], ["Purple", "#ece4f6", "#5b3a8f"], ["Teal", "#ddf1f0", "#16706b"],
  ];

  let S = { status: null, categories: [], products: [], orders: [], tab: "products", q: "", cat: "all" };

  /* Login token: kept in this browser for 12 hours, sent with every admin request. */
  const TOKEN_KEY = "wm_admin_token";
  let memToken = "";
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || memToken; } catch { return memToken; } };
  const setToken = (t) => { memToken = t || ""; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

  async function api(path, opts = {}) {
    let res;
    try {
      res = await fetch(apiUrl("api/" + path), {
        cache: "no-store", ...opts,
        headers: {
          ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}),
          ...(opts.body && !(opts.body instanceof Blob) ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}),
        },
      });
    } catch {
      throw new Error("Can't reach the shop server. It may be waking up: wait a minute and try again.");
    }
    const data = await res.json().catch(() => ({ ok: false, error: "The server didn't answer properly. Please try again." }));
    if (res.status === 401 && path !== "admin/login") { setToken(""); showLogin("Your session ended. Please log in again."); throw new Error("logged out"); }
    if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  const json = (body, method = "POST") => ({ method, body: JSON.stringify(body) });

  /* ---------- Login ---------- */
  function showLogin(msg = "") {
    document.getElementById("tabs").hidden = true;
    if (dlg.open) dlg.close();
    const off = S.status && !S.status.adminReady;
    app.innerHTML = `<form class="login" id="login">
      <h1>Shop admin</h1>
      <p style="color:var(--muted)">Add products and photos, and see orders.</p>
      ${off ? `<p class="notice bad">Admin is switched off. Add <b>ADMIN_PASSWORD</b> (at least 10 characters) in Render → Environment.</p>` : ""}
      <div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required></div>
      <p class="form-err" id="login-err">${esc(msg)}</p>
      <button class="btn btn-primary" style="width:100%;justify-content:center">Log in</button>
    </form>`;
    document.getElementById("pw").focus();
    document.getElementById("login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("login-err");
      err.textContent = "";
      try {
        const d = await api("admin/login", json({ password: document.getElementById("pw").value }));
        setToken(d.token);
        start();
      } catch (x) { err.textContent = x.message; }
    });
  }

  async function start() {
    app.innerHTML = `<p class="empty">Connecting to the shop server… (the first time can take up to a minute)</p>`;
    try {
      S.status = await api("admin/status");
      if (!S.status.loggedIn) return showLogin();
      document.getElementById("tabs").hidden = false;
      await loadCatalog();
      render();
    } catch (e) {
      if (e.message !== "logged out") app.innerHTML = `<p class="notice bad">${esc(e.message)}</p>`;
    }
  }
  async function loadCatalog() {
    const d = await api("admin/catalog");
    S.categories = d.categories; S.products = d.products;
  }

  document.getElementById("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    S.tab = b.dataset.tab;
    document.querySelectorAll("#tabs [data-tab]").forEach((x) => x.classList.toggle("on", x === b));
    render();
  });
  document.getElementById("logout").addEventListener("click", async () => {
    setToken("");
    showLogin("You've logged out.");
  });

  function notices() {
    const s = S.status, out = [];
    if (!s.db) out.push(`<p class="notice bad">The database isn't connected, so nothing can be saved. Add <b>DATABASE_URL</b> (from Neon) in Render → Environment.</p>`);
    if (!s.r2) out.push(`<p class="notice">Photos are being saved on the server itself, and Render deletes them on each update. Add the <b>R2_…</b> settings in Render → Environment so photos are kept in Cloudflare.</p>`);
    return out.join("");
  }

  function render() {
    if (S.tab === "products") renderProducts();
    else if (S.tab === "categories") renderCategories();
    else renderOrders();
  }

  /* ---------- Products ---------- */
  const catName = (id) => S.categories.find((c) => c.id === id)?.name || id;

  function renderProducts() {
    const q = S.q.toLowerCase();
    const list = S.products.filter((p) => (S.cat === "all" || p.cat === S.cat) && (!q || p.name.toLowerCase().includes(q)));
    app.innerHTML = `${notices()}
      <div class="bar">
        <h1>Products <span class="hint">(${S.products.length})</span></h1>
        <input id="q" type="search" placeholder="Search products" value="${esc(S.q)}" aria-label="Search products">
        <select id="cf" aria-label="Category"><option value="all">All categories</option>
          ${S.categories.map((c) => `<option value="${esc(c.id)}" ${S.cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
        <button class="btn btn-primary" id="add">+ Add product</button>
      </div>
      <div class="rows">${list.map((p) => `
        <div class="row">
          <div class="th" ${thumb(p.img)}>${p.img ? "" : ICONS.cart}</div>
          <div><b>${esc(p.name)}</b>
            <small>${esc(catName(p.cat))} · ${naira(p.price)}${p.old ? ` <s>${naira(p.old)}</s>` : ""}${p.featured ? " · ★ On home page" : ""}</small>
            ${p.in_stock ? "" : ` <span class="pill out">Sold out</span>`}</div>
          <div class="acts">
            <label class="switch"><input type="checkbox" data-stock="${p.id}" ${p.in_stock ? "checked" : ""}> In stock</label>
            <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${p.id}">Delete</button>
          </div>
        </div>`).join("") || `<p class="empty">No products yet. Click “Add product”.</p>`}</div>`;

    const qi = document.getElementById("q");
    qi.addEventListener("input", () => { S.q = qi.value; renderProducts(); const n = document.getElementById("q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    document.getElementById("cf").addEventListener("change", (e) => { S.cat = e.target.value; renderProducts(); });
    document.getElementById("add").addEventListener("click", () => editProduct(null));
    app.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editProduct(S.products.find((p) => p.id === +b.dataset.edit))));
    app.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const p = S.products.find((x) => x.id === +b.dataset.del);
      if (!confirm(`Delete "${p.name}"? It will disappear from the shop.`)) return;
      try { await api(`admin/products/${p.id}`, { method: "DELETE" }); await loadCatalog(); renderProducts(); toast("Product deleted"); }
      catch (e) { if (e.message !== "logged out") alert(e.message); }
    }));
    app.querySelectorAll("[data-stock]").forEach((cb) => cb.addEventListener("change", async () => {
      const p = S.products.find((x) => x.id === +cb.dataset.stock);
      try { await api(`admin/products/${p.id}`, json({ ...p, in_stock: cb.checked }, "PUT")); await loadCatalog(); renderProducts(); toast(cb.checked ? "Back in stock" : "Marked sold out"); }
      catch (e) { cb.checked = !cb.checked; if (e.message !== "logged out") alert(e.message); }
    }));
  }

  function editProduct(p) {
    if (!S.categories.length) return alert("Add a category first (Categories tab).");
    const v = p || { name: "", cat: S.cat !== "all" ? S.cat : S.categories[0].id, price: "", old: "", tag: "", summary: "", features: [], images: [], featured: false, in_stock: true };
    let images = [...v.images];
    form.innerHTML = `
      <h2>${p ? "Edit product" : "Add a product"}</h2>
      <div class="form-grid">
        <div class="field full"><label for="f-name">Name</label><input id="f-name" maxlength="120" value="${esc(v.name)}" placeholder="e.g. iPhone 13, 128GB (UK used)"></div>
        <div class="field"><label for="f-cat">Category</label><select id="f-cat">${S.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === v.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="f-tag">Label on the photo <span class="hint">(optional, e.g. New, Hot, UK used)</span></label><input id="f-tag" maxlength="30" value="${esc(v.tag)}"></div>
        <div class="field"><label for="f-price">Price (₦)</label><input id="f-price" inputmode="numeric" value="${esc(v.price)}" placeholder="250000"></div>
        <div class="field"><label for="f-old">Old price (₦) <span class="hint">(optional, shows as crossed out)</span></label><input id="f-old" inputmode="numeric" value="${esc(v.old ?? "")}"></div>
        <div class="field full"><label>Photos <span class="hint">(up to 8; the first one is the main photo)</span></label><div class="photos" id="f-photos"></div></div>
        <div class="field full"><label for="f-sum">Description</label><textarea id="f-sum" maxlength="2000" placeholder="A short description buyers see on the product page">${esc(v.summary)}</textarea></div>
        <div class="field full"><label for="f-feat">Key features <span class="hint">(one per line)</span></label><textarea id="f-feat" placeholder="128GB storage&#10;Battery health 88%&#10;Face ID working">${esc(v.features.join("\n"))}</textarea></div>
        <div class="field full checks">
          <label class="switch"><input type="checkbox" id="f-stock" ${v.in_stock ? "checked" : ""}> In stock</label>
          <label class="switch"><input type="checkbox" id="f-feat-home" ${v.featured ? "checked" : ""}> Show on the home page</label>
        </div>
      </div>
      <p class="form-err" id="f-err"></p>
      <div class="d-actions">
        <button type="button" class="btn btn-ghost" id="f-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary" id="f-save">${p ? "Save changes" : "Add product"}</button>
      </div>`;

    const box = document.getElementById("f-photos");
    let uploading = 0;
    const drawPhotos = () => {
      box.innerHTML = images.map((im, i) => `<div class="ph ${i ? "" : "main"}" ${thumb(im)}>
          ${i ? `<button type="button" class="mk" data-main="${i}" title="Make this the main photo">★</button>` : `<span class="lbl">Main</span>`}
          <button type="button" class="rm" data-rm="${i}" title="Remove photo">×</button></div>`).join("")
        + Array.from({ length: uploading }, () => `<div class="ph busy"></div>`).join("")
        + (images.length + uploading < 8 ? `<label class="add-ph">+ Add photos<input type="file" accept="image/*" multiple id="f-files"></label>` : "");
      box.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { images.splice(+b.dataset.rm, 1); drawPhotos(); }));
      box.querySelectorAll("[data-main]").forEach((b) => b.addEventListener("click", () => { const [m] = images.splice(+b.dataset.main, 1); images.unshift(m); drawPhotos(); }));
      document.getElementById("f-files")?.addEventListener("change", async (e) => {
        const files = [...e.target.files].slice(0, 8 - images.length - uploading);
        uploading += files.length; drawPhotos();
        for (const f of files) {
          try { images.push(await uploadPhoto(f)); }
          catch (x) { if (x.message !== "logged out") document.getElementById("f-err").textContent = x.message; }
          uploading--; drawPhotos();
        }
      });
    };
    drawPhotos();

    document.getElementById("f-cancel").onclick = () => dlg.close();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const err = document.getElementById("f-err");
      if (uploading) { err.textContent = "Please wait for the photos to finish uploading."; return; }
      const val = (id) => document.getElementById(id).value;
      const body = {
        name: val("f-name"), cat: val("f-cat"), tag: val("f-tag"), price: val("f-price"), old: val("f-old"),
        summary: val("f-sum"), features: val("f-feat").split("\n"), images,
        in_stock: document.getElementById("f-stock").checked, featured: document.getElementById("f-feat-home").checked,
      };
      const btn = document.getElementById("f-save");
      btn.disabled = true; err.textContent = "";
      try {
        await api(p ? `admin/products/${p.id}` : "admin/products", json(body, p ? "PUT" : "POST"));
        dlg.close(); await loadCatalog(); renderProducts(); toast(p ? "Saved" : "Product added to the shop");
      } catch (x) { if (x.message !== "logged out") err.textContent = x.message; btn.disabled = false; }
    };
    dlg.showModal();
    document.getElementById("f-name").focus();
  }

  /* Shrink big phone photos before upload (max 1600px). Also drops hidden location data. */
  async function uploadPhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch { throw new Error(`"${file.name}" couldn't be opened. Please use a JPG or PNG photo.`); }
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    let blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp") blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    const d = await api("admin/upload", { method: "POST", body: blob, headers: { "Content-Type": blob.type } });
    return d.url;
  }

  /* ---------- Categories ---------- */
  function renderCategories() {
    app.innerHTML = `${notices()}
      <div class="bar"><h1>Categories</h1><button class="btn btn-primary" id="add">+ Add category</button></div>
      <div class="rows">${S.categories.map((c) => {
        const n = S.products.filter((p) => p.cat === c.id).length;
        return `<div class="row">
          <div class="th" style="background-color:${esc(c.bg)};color:${esc(c.fg)};${c.img ? `background-image:url('${esc(photo(c.img, 200))}')` : ""}">${c.img ? "" : ICONS[c.icon] || ""}</div>
          <div><b>${esc(c.name)}</b><small>${esc(c.blurb)} · ${n} product${n === 1 ? "" : "s"}</small></div>
          <div class="acts">
            <button class="btn btn-ghost btn-sm" data-edit="${esc(c.id)}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${esc(c.id)}">Delete</button>
          </div></div>`;
      }).join("") || `<p class="empty">No categories yet.</p>`}</div>`;
    document.getElementById("add").addEventListener("click", () => editCategory(null));
    app.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editCategory(S.categories.find((c) => c.id === b.dataset.edit))));
    app.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const c = S.categories.find((x) => x.id === b.dataset.del);
      if (!confirm(`Delete the category "${c.name}"?`)) return;
      try { await api(`admin/categories/${encodeURIComponent(c.id)}`, { method: "DELETE" }); await loadCatalog(); renderCategories(); toast("Category deleted"); }
      catch (e) { if (e.message !== "logged out") alert(e.message); }
    }));
  }

  function editCategory(c) {
    const v = c || { name: "", blurb: "", icon: "smartphone", img: "", bg: COLORS[1][1], fg: COLORS[1][2] };
    let img = v.img;
    const colorIdx = Math.max(0, COLORS.findIndex((x) => x[1] === v.bg));
    form.innerHTML = `
      <h2>${c ? "Edit category" : "Add a category"}</h2>
      <div class="form-grid">
        <div class="field"><label for="c-name">Name</label><input id="c-name" maxlength="40" value="${esc(v.name)}" placeholder="e.g. Phones"></div>
        <div class="field"><label for="c-blurb">Short line</label><input id="c-blurb" maxlength="80" value="${esc(v.blurb)}" placeholder="e.g. iPhones, Samsung, Tecno"></div>
        <div class="field"><label for="c-icon">Icon</label><select id="c-icon">${S.status.icons.map((i) => `<option ${i === v.icon ? "selected" : ""}>${i}</option>`).join("")}</select></div>
        <div class="field"><label for="c-col">Colour</label><select id="c-col">${COLORS.map((x, i) => `<option value="${i}" ${i === colorIdx ? "selected" : ""}>${x[0]}</option>`).join("")}</select></div>
        <div class="field full"><label>Photo <span class="hint">(shown on the home page)</span></label><div class="photos" id="c-photo"></div></div>
      </div>
      <p class="form-err" id="c-err"></p>
      <div class="d-actions">
        <button type="button" class="btn btn-ghost" id="c-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary" id="c-save">${c ? "Save changes" : "Add category"}</button>
      </div>`;
    const box = document.getElementById("c-photo");
    let busy = false;
    const draw = () => {
      box.innerHTML = busy ? `<div class="ph busy"></div>` : img
        ? `<div class="ph main" ${thumb(img)}><button type="button" class="rm" title="Remove photo">×</button></div>`
        : `<label class="add-ph">+ Add photo<input type="file" accept="image/*" id="c-file"></label>`;
      box.querySelector(".rm")?.addEventListener("click", () => { img = ""; draw(); });
      document.getElementById("c-file")?.addEventListener("change", async (e) => {
        busy = true; draw();
        try { img = await uploadPhoto(e.target.files[0]); } catch (x) { if (x.message !== "logged out") document.getElementById("c-err").textContent = x.message; }
        busy = false; draw();
      });
    };
    draw();
    document.getElementById("c-cancel").onclick = () => dlg.close();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const err = document.getElementById("c-err");
      if (busy) { err.textContent = "Please wait for the photo to finish uploading."; return; }
      const col = COLORS[+document.getElementById("c-col").value];
      const body = { name: document.getElementById("c-name").value, blurb: document.getElementById("c-blurb").value,
        icon: document.getElementById("c-icon").value, img, bg: col[1], fg: col[2] };
      try {
        await api(c ? `admin/categories/${encodeURIComponent(c.id)}` : "admin/categories", json(body, c ? "PUT" : "POST"));
        dlg.close(); await loadCatalog(); renderCategories(); toast(c ? "Saved" : "Category added");
      } catch (x) { if (x.message !== "logged out") err.textContent = x.message; }
    };
    dlg.showModal();
    document.getElementById("c-name").focus();
  }

  /* ---------- Orders ---------- */
  const STATUS_TEXT = { whatsapp: "Sent on WhatsApp", pending: "Waiting for payment", paid: "Paid", review: "Check payment", confirmed: "Confirmed", delivered: "Delivered", cancelled: "Cancelled" };
  async function renderOrders() {
    app.innerHTML = `${notices()}<div class="bar"><h1>Orders</h1><button class="btn btn-ghost btn-sm" id="reload">Refresh</button></div><p class="empty">Loading orders…</p>`;
    document.getElementById("reload").onclick = renderOrders;
    try { S.orders = (await api("admin/orders")).orders; } catch (e) { if (e.message !== "logged out") app.querySelector(".empty").textContent = e.message; return; }
    if (S.tab !== "orders") return;
    const list = S.orders.map((o) => {
      const c = o.customer, wa = `https://wa.me/${c.phone.replace(/^0/, "234").replace(/^\+/, "")}`;
      return `<div class="order">
        <header><b>${esc(o.reference)}</b><span class="pill ${esc(o.status)}">${esc(STATUS_TEXT[o.status] || o.status)}</span>
          <span class="when">${new Date(o.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
          <b>${naira(o.total)}</b></header>
        <ul>${o.lines.map((l) => `<li>${esc(l.name)} × ${l.qty} — ${naira(l.line)}</li>`).join("")}
          ${o.discount ? `<li>Student laptop deal: −${naira(o.discount)}</li>` : ""}
          <li>${esc(o.delivery.name)}: ${o.delivery.fee ? naira(o.delivery.fee) : "Free"}</li></ul>
        <div class="who"><b>${esc(c.name)}</b> · <a href="${esc(wa)}" target="_blank" rel="noopener">${esc(c.phone)} (WhatsApp)</a>
          ${c.email ? ` · ${esc(c.email)}` : ""}${c.address ? `<br>Address: ${esc(c.address)}` : ""}${c.note ? `<br>Note: ${esc(c.note)}` : ""}
          ${o.note_internal ? `<br><b style="color:#c0342a">${esc(o.note_internal)}</b>` : ""}</div>
        <div><select data-ref="${esc(o.reference)}" aria-label="Update status"><option value="">Update status…</option>
          <option value="confirmed">Confirmed</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
      </div>`;
    }).join("");
    app.querySelector(".empty").outerHTML = `<div class="rows">${list || `<p class="empty">No orders yet. Orders sent from the checkout appear here.</p>`}</div>`;
    app.querySelectorAll("[data-ref]").forEach((s) => s.addEventListener("change", async () => {
      if (!s.value) return;
      try { await api(`admin/orders/${s.dataset.ref}`, json({ status: s.value }, "PUT")); toast("Order updated"); renderOrders(); }
      catch (e) { if (e.message !== "logged out") alert(e.message); }
    }));
  }

  // toast() from app.js needs its container.
  document.body.insertAdjacentHTML("beforeend", `<div class="toast" id="toast"></div>`);
  start();
})();
