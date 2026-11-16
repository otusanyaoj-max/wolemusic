/* Wolemusic website settings.

   WM_API is the backend (server.js on Render). Products, categories, prices,
   delivery fees and shop details all come from it, and Wole manages them in admin.html.
   The values below are only used for a moment if the backend can't be reached. */
window.WM_API = "https://wole-music.onrender.com";

window.CATALOG = {
  payments_enabled: false,
  whatsapp: "2348023556976",
  shop: {
    phone: "0802 355 6976",
    email: "orders@wolemusic.com",
    address: "OAU Campus, Ile-Ife, Osun State",
    hours: "Monday – Saturday, 9:00am – 6:00pm",
    mapQuery: "Obafemi Awolowo University, Ile-Ife",
  },
  delivery: [
    { id: "pickup", name: "Pickup at our OAU shop", note: "Ready same day once payment is confirmed", fee: 0 },
  ],
  deal: { cat: "laptops", min: 200000, off: 30000 },
  categories: [],
  products: [],
};

// Local testing only: point the pages at another backend without editing this file.
try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem("wm_api")) window.WM_API = localStorage.getItem("wm_api"); } catch {}
