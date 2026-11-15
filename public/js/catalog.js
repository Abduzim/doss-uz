import { $, $$, api, card, esc, getCategories, mountLayout, skeletonCards } from "/js/core.js";

const params = new URLSearchParams(location.search);
const state = {
  category: params.get("category") || "",
  size: params.get("size") || "",
  sort: params.get("sort") || "new",
  q: params.get("q") || "",
  only: params.get("only") || "",
};

mountLayout({ active: state.only === "new" ? "new" : "catalog" });

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"];
$("#size").innerHTML = `<option value="">Razmer</option>` + SIZES.map((s) => `<option>${s}</option>`).join("");
$("#size").value = state.size;
$("#sort").value = state.sort;

let categories = [];
let seq = 0;

function syncUrl() {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v && !(k === "sort" && v === "new")) next.set(k, v);
  history.replaceState(null, "", next.size ? `?${next}` : location.pathname);
}

function renderHead() {
  const cat = categories.find((c) => c.slug === state.category);
  let title = "Katalog";
  let lead = "Kuz–Qish 2026–2027 kolleksiyasining barcha modellari.";
  if (state.q) {
    title = `“${state.q}”`;
    lead = "Qidiruv natijalari.";
  } else if (cat) {
    title = cat.name;
    lead = cat.description;
  } else if (state.only === "new") {
    title = "Yangi kolleksiya";
    lead = "Do‘konga eng so‘nggi kelgan modellar.";
  }
  $("#title").textContent = title;
  $("#crumb").textContent = title;
  $("#lead").textContent = lead;
  document.title = `${title} — DOSS_UZ`;

  const chip = (label, active, data, count) =>
    `<button type="button" class="chip${active ? " active" : ""}" ${data}>${esc(label)}${count ? ` <small>${count}</small>` : ""}</button>`;
  $("#chips").innerHTML =
    chip("Barchasi", !state.category && !state.only && !state.q, 'data-all="1"') +
    chip("Yangi", state.only === "new", 'data-only="new"') +
    categories.map((c) => chip(c.name, c.slug === state.category, `data-category="${esc(c.slug)}"`, c.count)).join("");
}

async function load() {
  const mine = ++seq;
  syncUrl();
  renderHead();
  $("#empty").hidden = true;
  $("#grid").innerHTML = skeletonCards(8);
  $("#count").textContent = "";

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v) query.set(k, v);
  try {
    const { items, total } = await api(`/products?${query}`);
    if (mine !== seq) return;
    $("#grid").innerHTML = items.map(card).join("");
    $("#empty").hidden = items.length > 0;
    $("#count").textContent = `${total} ta model`;
  } catch (err) {
    if (mine !== seq) return;
    $("#grid").innerHTML = `<p class="muted">${esc(err.message)}</p>`;
  }
}

$("#chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.q = "";
  state.category = chip.dataset.category || "";
  state.only = chip.dataset.only || "";
  load();
});
$("#size").addEventListener("change", (e) => {
  state.size = e.target.value;
  load();
});
$("#sort").addEventListener("change", (e) => {
  state.sort = e.target.value;
  load();
});

// Ustunlar soni (faqat katta ekranda), tanlov eslab qolinadi
function setCols(n) {
  $("#grid").dataset.cols = n;
  $$("#cols button").forEach((b) => b.classList.toggle("active", b.dataset.cols === String(n)));
  try {
    localStorage.setItem("doss_cols", n);
  } catch {
    /* saqlanmasa ham ishlayveradi */
  }
}
$("#cols").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) setCols(b.dataset.cols);
});
let savedCols = "4";
try {
  savedCols = localStorage.getItem("doss_cols") || "4";
} catch {
  /* standart qiymat */
}
setCols(savedCols);

categories = await getCategories().catch(() => []);
load();
