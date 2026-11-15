// Admin panel: kirish, buyurtmalar, mahsulotlar.
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so‘m`;
const when = (iso) =>
  new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS = { new: "Yangi", confirmed: "Tasdiqlangan", shipped: "Yo‘lda", done: "Yakunlangan", cancelled: "Bekor qilingan" };

let token = sessionStorage.getItem("doss_admin") || "";
let categories = [];
let products = [];
let editing = null; // tahrirlanayotgan mahsulot (yangi bo'lsa id yo'q)
let media = [];

/* ---------- API ---------- */
async function api(path, { method = "GET", body, form } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && token) {
    logout();
    throw new Error("Sessiya tugadi, qayta kiring");
  }
  if (!res.ok) throw new Error(data?.message || "Xatolik yuz berdi");
  return data;
}

let toastTimer;
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Kirish ---------- */
function logout() {
  token = "";
  sessionStorage.removeItem("doss_admin");
  $("#panel").hidden = true;
  $("#login").hidden = false;
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = $("#login-error");
  error.hidden = true;
  try {
    const data = await api("/auth/login", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
    token = data.token;
    sessionStorage.setItem("doss_admin", token);
    e.target.reset();
    start();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
});
$("#logout").addEventListener("click", logout);

/* ---------- Statistika va buyurtmalar ---------- */
async function loadStats() {
  const s = await api("/admin/stats");
  $("#stats").innerHTML = `
    <div><b>${s.new_orders}</b><span>yangi buyurtma</span></div>
    <div><b>${s.orders}</b><span>jami buyurtma</span></div>
    <div><b>${money(s.revenue)}</b><span>buyurtmalar summasi</span></div>
    <div><b>${s.products}</b><span>saytdagi mahsulot</span></div>`;
  $("#new-count").textContent = s.new_orders;
  $("#new-count").hidden = !s.new_orders;
}

async function loadOrders() {
  const status = $("#order-filter").value;
  const orders = await api(`/admin/orders${status ? `?status=${status}` : ""}`);
  $("#orders").innerHTML = orders.length
    ? orders
        .map(
          (o) => `
      <article class="order${o.status === "new" ? " is-new" : ""}">
        <div class="top">
          <div class="who">
            <b>№${o.id} · ${esc(o.customer_name)}</b> · <a href="tel:${esc(o.phone.replace(/[^\d+]/g, ""))}">${esc(o.phone)}</a>
            <div class="meta">${when(o.created_at)} · ${
              o.delivery === "pickup" ? "Do‘kondan olib ketadi" : esc([o.region, o.address].filter(Boolean).join(", "))
            }</div>
            ${o.comment ? `<div class="meta">Izoh: ${esc(o.comment)}</div>` : ""}
          </div>
          <label class="select"><select data-order="${o.id}" aria-label="Buyurtma holati">
            ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === o.status ? " selected" : ""}>${v}</option>`).join("")}
          </select></label>
        </div>
        <ul>${o.items.map((i) => `<li><span>${esc(i.title)} — ${i.size === "—" ? "razmer kelishiladi" : esc(i.size)} × ${i.quantity}</span><span>${money(i.price * i.quantity)}</span></li>`).join("")}</ul>
        <div class="sum"><span>Jami</span><span>${money(o.total)}</span></div>
      </article>`
        )
        .join("")
    : '<p class="muted" style="padding:40px 0">Buyurtmalar yo‘q.</p>';
}

$("#order-filter").addEventListener("change", loadOrders);
$("#orders").addEventListener("change", async (e) => {
  const id = e.target.dataset.order;
  if (!id) return;
  try {
    await api(`/admin/orders/${id}`, { method: "PATCH", body: { status: e.target.value } });
    toast("Holat yangilandi");
    loadStats();
    loadOrders();
  } catch (err) {
    toast(err.message);
  }
});

/* ---------- Mahsulotlar ---------- */
const coverOf = (p) => {
  const image = p.media.find((m) => m.kind === "image");
  return image?.url || p.media[0]?.poster_url || "/img/placeholder.svg";
};

async function loadProducts() {
  const q = $("#product-search").value.trim();
  const data = await api(`/admin/products${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  products = data.items;
  $("#products").innerHTML = `
    <thead><tr><th></th><th>Nomi</th><th>Kategoriya</th><th>Narxi</th><th>Razmerlar</th><th>Belgilar</th></tr></thead>
    <tbody>${products
      .map(
        (p) => `
      <tr data-id="${p.id}" class="${p.is_active ? "" : "off"}">
        <td><img src="${esc(coverOf(p))}" alt="" loading="lazy"></td>
        <td>${esc(p.title)}</td>
        <td>${esc(p.category_name)}</td>
        <td style="white-space:nowrap">${p.price ? money(p.price) : "—"}</td>
        <td>${esc(p.sizes.join(", ")) || "—"}</td>
        <td>${p.is_active ? "" : '<span class="tag">yashirin</span>'}${p.is_new ? '<span class="tag">yangi</span>' : ""}${p.is_featured ? '<span class="tag">tanlangan</span>' : ""}</td>
      </tr>`
      )
      .join("")}</tbody>`;
}

let searchTimer;
$("#product-search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadProducts().catch((err) => toast(err.message)), 250);
});

/* ---------- Mahsulot formasi ---------- */
const form = $("#product-form");
const f = form.elements; // f.title kabi nomlar HTML atributlari bilan adashmasligi uchun

function renderMedia() {
  $("#media-list").innerHTML = media
    .map(
      (m, i) => `
      <div class="media-item">
        <img src="${esc(m.kind === "image" ? m.url : m.poster_url || "/img/placeholder.svg")}" alt="">
        <span class="kind">${m.kind === "video" ? "VIDEO" : "RASM"}</span>
        <div class="ops">
          ${i > 0 ? `<button type="button" data-move="${i}" title="Oldinga surish">←</button>` : ""}
          <button type="button" data-drop="${i}" title="Olib tashlash">✕</button>
        </div>
      </div>`
    )
    .join("");
}

function openEditor(p) {
  editing = p || {};
  media = (p?.media || []).map((m) => ({ ...m }));
  $("#editor-title").textContent = p ? "Mahsulotni tahrirlash" : "Yangi mahsulot";
  $("#delete").hidden = !p;
  $("#product-error").hidden = true;
  $("#f-category").innerHTML = categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");

  f.title.value = p?.title || "";
  f.category_id.value = p?.category_id || categories[0]?.id || "";
  f.price.value = p?.price ?? "";
  f.material.value = p?.material || "";
  f.brand.value = p?.brand || "";
  f.sizes.value = (p?.sizes || ["M", "L", "XL", "2XL", "3XL"]).join(", ");
  f.description.value = p?.description || "";
  f.features.value = (p?.features || []).join("\n");
  f.is_active.checked = p ? p.is_active : true;
  f.is_new.checked = p ? p.is_new : true;
  f.is_featured.checked = p ? p.is_featured : false;

  renderMedia();
  $("#editor").classList.add("open");
  $("#backdrop").classList.add("open");
  document.body.classList.add("locked");
}

function closeEditor() {
  $("#editor").classList.remove("open");
  $("#backdrop").classList.remove("open");
  document.body.classList.remove("locked");
}

$("#add-product").addEventListener("click", () => openEditor(null));
$("#editor-close").addEventListener("click", closeEditor);
$("#backdrop").addEventListener("click", closeEditor);
$("#products").addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-id]");
  if (row) openEditor(products.find((p) => p.id === Number(row.dataset.id)));
});

$("#media-list").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.drop) media.splice(Number(b.dataset.drop), 1);
  if (b.dataset.move) {
    const i = Number(b.dataset.move);
    [media[i - 1], media[i]] = [media[i], media[i - 1]];
  }
  renderMedia();
});

$("#files").addEventListener("change", async (e) => {
  if (!e.target.files.length) return;
  const data = new FormData();
  for (const f of e.target.files) data.append("files", f);
  const label = $("#upload-label");
  label.textContent = "Yuklanmoqda…";
  try {
    media.push(...(await api("/admin/upload", { method: "POST", form: data })));
    renderMedia();
  } catch (err) {
    toast(err.message);
  }
  label.textContent = "Fayl yuklash (JPG, PNG, WEBP, MP4)";
  e.target.value = "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = $("#product-error");
  error.hidden = true;
  const body = {
    title: f.title.value,
    category_id: Number(f.category_id.value),
    price: Number(f.price.value || 0),
    material: f.material.value,
    brand: f.brand.value,
    sizes: f.sizes.value.split(",").map((s) => s.trim()).filter(Boolean),
    description: f.description.value,
    features: f.features.value.split("\n").map((s) => s.trim()).filter(Boolean),
    is_active: f.is_active.checked,
    is_new: f.is_new.checked,
    is_featured: f.is_featured.checked,
    media: media.map(({ kind, url, poster_url, preview_url }) => ({ kind, url, poster_url, preview_url })),
  };
  $("#save").disabled = true;
  try {
    if (editing.id) await api(`/admin/products/${editing.id}`, { method: "PUT", body });
    else await api("/admin/products", { method: "POST", body });
    closeEditor();
    toast("Saqlandi");
    await Promise.all([loadProducts(), loadStats()]);
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
  $("#save").disabled = false;
});

$("#delete").addEventListener("click", async () => {
  if (!editing.id || !confirm(`“${editing.title}” o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.`)) return;
  try {
    await api(`/admin/products/${editing.id}`, { method: "DELETE" });
    closeEditor();
    toast("O‘chirildi");
    await Promise.all([loadProducts(), loadStats()]);
  } catch (err) {
    toast(err.message);
  }
});

/* ---------- Tablar va ishga tushirish ---------- */
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
  $("#tab-orders").hidden = b.dataset.tab !== "orders";
  $("#tab-products").hidden = b.dataset.tab !== "products";
});

async function start() {
  if (!token) return logout();
  try {
    await api("/auth/me");
  } catch {
    return; // logout() allaqachon chaqirilgan
  }
  $("#login").hidden = true;
  $("#panel").hidden = false;
  try {
    categories = await api("/categories");
    await Promise.all([loadStats(), loadOrders(), loadProducts()]);
  } catch (err) {
    toast(err.message);
  }
}
start();
