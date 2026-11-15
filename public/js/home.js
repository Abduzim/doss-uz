import { $, $$, api, card, esc, getCategories, icons, mountLayout, rails, reveal, site, skeletonCards } from "/js/core.js";

mountLayout({ overHero: true });

// Hero videosi: avtoijro bloklangan bo'lsa (masalan, quvvat tejash rejimi) poster rasm qoladi
$(".hero video")?.play().catch(() => {});

$$("[data-prev]").forEach((b) => (b.innerHTML = icons.left));
$$("[data-next]").forEach((b) => (b.innerHTML = icons.right));

const mapSrc = `https://www.google.com/maps?q=${site.lat},${site.lng}&z=16&output=embed`;
$("#visit").innerHTML = `
  <div class="info reveal">
    <div class="kicker muted">Do‘konimiz</div>
    <h2 class="serif">Kelib, kiyib ko‘ring</h2>
    <dl>
      <div><dt>Manzil</dt><dd>${esc(site.city)}, ${esc(site.address)}<br><span class="muted" style="font-size:14px">${esc(site.landmark)}</span></dd></div>
      <div><dt>Ish vaqti</dt><dd>${esc(site.hours)}</dd></div>
      <div><dt>Telefon</dt><dd><a class="underline" href="${site.phoneHref}">${esc(site.phone)}</a></dd></div>
    </dl>
    <div class="actions">
      <a class="btn btn-dark" href="https://maps.google.com/maps?q=${site.lat},${site.lng}" target="_blank" rel="noopener">Xaritada ochish</a>
      <a class="btn btn-line" href="${site.telegram}" target="_blank" rel="noopener">${icons.telegram} Telegram</a>
    </div>
  </div>
  <div class="map"><iframe title="Doss_uz do‘koni xaritada" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapSrc}"></iframe></div>`;

$("#new-rail").innerHTML = skeletonCards(5);
$("#featured-grid").innerHTML = skeletonCards(8);

const failed = (el) => (el.innerHTML = '<p class="muted">Ma’lumotni yuklab bo‘lmadi. Sahifani yangilab ko‘ring.</p>');

getCategories()
  .then((cats) => {
    const total = cats.reduce((n, c) => n + c.count, 0);
    $("#facts").innerHTML = `
      <div><b>${total}</b><span>model kolleksiyada</span></div>
      <div><b>M–3XL</b><span>razmerlar</span></div>
      <div><b>11–23</b><span>har kuni ochiq</span></div>`;
  })
  .catch(() => {});

api("/products?only=new&limit=12")
  .then(({ items }) => {
    $("#new-rail").innerHTML = items.map((p) => `<div>${card(p)}</div>`).join("");
    rails();
  })
  .catch(() => failed($("#new-rail")));

api("/products?only=featured&limit=8")
  .then(({ items }) => ($("#featured-grid").innerHTML = items.map(card).join("")))
  .catch(() => failed($("#featured-grid")));

reveal();
