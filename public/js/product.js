import {
  $, $$, NO_SIZE, api, card, cart, esc, favs, icons, mediaOf, mountLayout, openOverlay, priceHtml, rails, site, toast,
} from "/js/core.js";

mountLayout({ active: "catalog" });

const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");
const view = $("#view");

let product;
try {
  product = await api(`/products/${encodeURIComponent(slug)}`);
} catch (err) {
  view.innerHTML = `
    <div class="empty">
      <h2 class="serif">${err.status === 404 ? "Mahsulot topilmadi" : "Xatolik yuz berdi"}</h2>
      <p>${err.status === 404 ? "Ehtimol, u sotuvdan olingan yoki havola noto‘g‘ri." : esc(err.message)}</p>
      <a class="btn btn-dark" href="/catalog">Katalogga qaytish</a>
    </div>`;
  throw err;
}

const p = product;
const { images, videos } = mediaOf(p);
document.title = `${p.title} — DOSS_UZ`;

/* ---------- Galereya: avval rasmlar, bitta video (bosilganda o'ynaydi) ---------- */
const shots = images.map((image) => ({ image }));
if (videos.length) shots.splice(Math.min(3, shots.length), 0, { video: videos[0] });
// Ikki ustunli to'r chiroyli yopilishi uchun toq bo'lsa oxirgi rasmni olib tashlaymiz
if (shots.length > 3 && shots.length % 2 && shots.at(-1).image) shots.pop();

const zoomable = shots.filter((s) => s.image).map((s) => s.image);

const shotHtml = (s) =>
  s.image
    ? `<button type="button" class="shot" data-zoom="${zoomable.indexOf(s.image)}" aria-label="Kattalashtirish">
         <img src="${esc(s.image)}" alt="${esc(p.title)}" loading="lazy" decoding="async">
       </button>`
    : `<div class="shot video">
         <video src="${esc(s.video.url)}" poster="${esc(s.video.poster_url || "")}" playsinline preload="none"></video>
         <button type="button" class="play-btn" data-play aria-label="Videoni ko‘rish"><i>${icons.play}</i><span class="caps">Videoni ko‘rish</span></button>
       </div>`;

const hasSizes = p.sizes.length > 0;
const tgText = encodeURIComponent(`Assalomu alaykum! "${p.title}" haqida ma’lumot olmoqchi edim: ${location.href}`);
const tgLink = `${site.telegramContact}?text=${tgText}`;

const specs = [
  ["Kategoriya", p.category_name],
  p.material && ["Material", p.material],
  p.brand && ["Brend", p.brand],
  hasSizes && ["Razmerlar", `${p.sizes[0]} — ${p.sizes.at(-1)}`],
].filter(Boolean);

view.innerHTML = `
  <nav class="crumbs" aria-label="Yo‘l">
    <a href="/">Bosh sahifa</a><span>/</span><a href="/catalog">Katalog</a><span>/</span>
    <a href="/catalog?category=${esc(p.category_slug)}">${esc(p.category_name)}</a>
  </nav>
  <div class="product">
    <div class="gallery no-scrollbar">${shots.map(shotHtml).join("")}</div>
    <div class="info">
      <div class="kicker cat">${p.is_new ? "Yangi · " : ""}${esc(p.category_name)}</div>
      <h1 class="serif">${esc(p.title)}</h1>
      <div class="price">${priceHtml(p)}</div>
      <p class="lead">${esc(p.description)}</p>
      <dl class="specs">${specs.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>

      ${
        hasSizes
          ? `<div class="field-label"><span>Razmerni tanlang</span><a class="underline muted" href="${tgLink}" target="_blank" rel="noopener">Razmer bo‘yicha maslahat</a></div>
             <div class="sizes" id="sizes" role="group" aria-label="Razmer">
               ${p.sizes.map((s) => `<button type="button" aria-pressed="false" data-size="${esc(s)}">${esc(s)}</button>`).join("")}
             </div>`
          : ""
      }
      <div class="hint" id="hint" role="alert"></div>

      <div class="buy">
        ${
          p.price
            ? `<button class="btn btn-dark" type="button" id="add">Savatga qo‘shish</button>`
            : `<a class="btn btn-dark" href="${tgLink}" target="_blank" rel="noopener">Narxini bilish</a>`
        }
        <button class="btn-fav" type="button" data-fav="${p.id}" aria-pressed="${favs.has(p.id)}" aria-label="Sevimlilarga qo‘shish">${icons.heart}</button>
        <a class="btn btn-line tg" href="${tgLink}" target="_blank" rel="noopener">${icons.telegram} Telegram orqali so‘rash</a>
      </div>

      <ul class="perks">
        <li>${icons.truck}<span>${esc(site.delivery)}</span></li>
        <li>${icons.pin}<span>Do‘konda kiyib ko‘rish mumkin — ${esc(site.address)}</span></li>
        <li>${icons.clock}<span>${esc(site.hours)} · <a class="underline" href="${site.phoneHref}">${esc(site.phone)}</a></span></li>
      </ul>

      <div class="acc">
        ${
          p.features.length
            ? `<details open><summary>Xususiyatlari</summary><div class="body"><ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div></details>`
            : ""
        }
        <details><summary>Razmer tanlash</summary><div class="body">
          ${hasSizes ? `Mavjud razmerlar: ${p.sizes.map(esc).join(", ")}. ` : "Razmer buyurtmani tasdiqlashda aniqlanadi. "}
          Qaysi razmer mos kelishiga ishonchingiz komil bo‘lmasa, bo‘yingiz va vazningizni
          <a class="underline" href="${tgLink}" target="_blank" rel="noopener">Telegram orqali</a> yozing — mos razmerni tavsiya qilamiz.
        </div></details>
        <details><summary>Yetkazib berish</summary><div class="body">
          Respublika bo‘ylab yetkazib berish xizmati mavjud. Buyurtma berganingizdan so‘ng menejerimiz siz bilan bog‘lanib,
          yetkazib berish muddati va narxini aniqlashtiradi. Toshkentda do‘konimizga kelib, o‘zingiz olib ketishingiz ham mumkin.
        </div></details>
      </div>
    </div>
  </div>`;

/* ---------- Razmer va savat ---------- */
let size = hasSizes ? null : NO_SIZE;
$("#sizes")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-size]");
  if (!b) return;
  size = b.dataset.size;
  $$("#sizes button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  $("#hint").textContent = "";
});
$("#add")?.addEventListener("click", () => {
  if (!size) {
    $("#hint").textContent = "Avval razmerni tanlang";
    const box = $("#sizes");
    box.classList.remove("shake");
    void box.offsetWidth;
    box.classList.add("shake");
    return;
  }
  cart.add(p, size);
  openOverlay("cart");
});

/* ---------- Video ---------- */
$("[data-play]")?.addEventListener("click", (e) => {
  const shot = e.currentTarget.closest(".shot");
  const video = $("video", shot);
  shot.classList.add("playing");
  video.controls = true;
  video.play().catch(() => shot.classList.remove("playing"));
});

/* ---------- Lightbox ---------- */
const box = $("#lightbox");
$(".x", box).innerHTML = icons.close;
$(".prev", box).innerHTML = icons.left;
$(".next", box).innerHTML = icons.right;
let current = 0;
const show = (i) => {
  current = (i + zoomable.length) % zoomable.length;
  $("img", box).src = zoomable[current];
  $(".n", box).textContent = `${current + 1} / ${zoomable.length}`;
};
const closeBox = () => {
  box.classList.remove("open");
  document.body.classList.remove("locked");
};
view.addEventListener("click", (e) => {
  const shot = e.target.closest("[data-zoom]");
  if (!shot) return;
  show(Number(shot.dataset.zoom));
  box.classList.add("open");
  document.body.classList.add("locked");
});
box.addEventListener("click", (e) => {
  if (e.target.closest(".prev")) show(current - 1);
  else if (e.target.closest(".next")) show(current + 1);
  else closeBox();
});
document.addEventListener("keydown", (e) => {
  if (!box.classList.contains("open")) return;
  if (e.key === "Escape") closeBox();
  if (e.key === "ArrowLeft") show(current - 1);
  if (e.key === "ArrowRight") show(current + 1);
});

/* ---------- O'xshash mahsulotlar ---------- */
if (p.related?.length) {
  const related = $("#related");
  $(".rail", related).innerHTML = p.related.map((r) => `<div>${card(r)}</div>`).join("");
  $("[data-prev]", related).innerHTML = icons.left;
  $("[data-next]", related).innerHTML = icons.right;
  related.hidden = false;
  rails(related.parentElement);
}
