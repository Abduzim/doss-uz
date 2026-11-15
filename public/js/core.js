// Barcha sahifalar uchun umumiy qism: header, footer, savat, sevimlilar, qidiruv.
import { site } from "/js/site.js";

export { site };
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Razmeri ko'rsatilmagan mahsulotlar (masalan, poyabzal) uchun
export const NO_SIZE = "—";

export const money = (n) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${site.currency}`;

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || "Xatolik yuz berdi");
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

/* ---------- Ikonkalar ---------- */
const svg = (d, size = 20, extra = "") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icons = {
  menu: svg('<path d="M3 8.5h18M3 15.5h18"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  heart: svg('<path d="M12 20.3s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10-7.5 10z"/>', 18),
  bag: svg('<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
  close: svg('<path d="M5 5l14 14M19 5 5 19"/>'),
  arrow: svg('<path d="M4 12h16m-6-6 6 6-6 6"/>', 22),
  left: svg('<path d="m14.5 5-7 7 7 7"/>', 18),
  right: svg('<path d="m9.5 5 7 7-7 7"/>', 18),
  truck: svg('<path d="M2.5 6.5h11v10h-11zM13.5 10h4.2l3.3 3.4v3.1h-7.5z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  pin: svg('<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 26),
  play: svg('<path d="M9 6v12l9.5-6z" fill="currentColor" stroke="none"/>', 24),
  telegram: svg('<path d="M21 4 2.8 11.2l5.6 2 2.1 6.3 3.2-3.9 4.6 3.4z"/><path d="m8.4 13.2 8.3-5.6-6.2 7"/>', 18),
};

/* ---------- Savat va sevimlilar (localStorage) ---------- */
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* maxfiy rejimda saqlanmasligi mumkin */
  }
};

export const cart = {
  items: read("doss_cart", []),
  save() {
    write("doss_cart", this.items);
    document.dispatchEvent(new CustomEvent("cart:change"));
  },
  add(product, size) {
    const found = this.items.find((i) => i.id === product.id && i.size === size);
    if (found) found.qty = Math.min(found.qty + 1, 20);
    else {
      this.items.push({
        id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        image: mediaOf(product).cover,
        size,
        qty: 1,
      });
    }
    this.save();
  },
  setQty(id, size, qty) {
    const item = this.items.find((i) => i.id === id && i.size === size);
    if (!item) return;
    item.qty = Math.max(1, Math.min(qty, 20));
    this.save();
  },
  remove(id, size) {
    this.items = this.items.filter((i) => !(i.id === id && i.size === size));
    this.save();
  },
  clear() {
    this.items = [];
    this.save();
  },
  get count() {
    return this.items.reduce((n, i) => n + i.qty, 0);
  },
  get total() {
    return this.items.reduce((n, i) => n + i.qty * i.price, 0);
  },
};

export const favs = {
  ids: read("doss_favs", []),
  has(id) {
    return this.ids.includes(id);
  },
  toggle(id) {
    this.ids = this.has(id) ? this.ids.filter((x) => x !== id) : [...this.ids, id];
    write("doss_favs", this.ids);
    document.dispatchEvent(new CustomEvent("favs:change"));
    return this.has(id);
  },
};

/* ---------- Mahsulot yordamchilari ---------- */
export function mediaOf(p) {
  const images = [];
  const videos = [];
  for (const m of p.media || []) {
    if (m.kind === "image") images.push(m.url);
    else videos.push(m);
  }
  const cover = images[0] || videos[0]?.poster_url || "/img/placeholder.svg";
  return { images, videos, cover, preview: videos[0]?.preview_url || null };
}

export function card(p) {
  const { cover, images } = mediaOf(p);
  const alt = images[1]; // sichqoncha kelganda ko'rinadigan ikkinchi rasm
  const href = `/catalog/${esc(p.slug)}`;
  return `
    <article class="card">
      <a class="card-media" href="${href}" aria-label="${esc(p.title)}" ${alt ? `data-alt="${esc(alt)}"` : ""}>
        <img src="${esc(cover)}" alt="${esc(p.title)}" loading="lazy" decoding="async">
      </a>
      ${p.is_new ? '<span class="badge">Yangi</span>' : ""}
      <button class="fav" type="button" data-fav="${p.id}" aria-pressed="${favs.has(p.id)}" aria-label="Sevimlilarga qo‘shish">${icons.heart}</button>
      <a class="card-info" href="${href}">
        <div class="cat">${esc(p.category_name)}</div>
        <h3>${esc(p.title)}</h3>
        <div class="price">${priceHtml(p)}</div>
      </a>
    </article>`;
}

export const priceHtml = (p) =>
  p.price ? `${money(p.price)}${p.old_price ? `<s>${money(p.old_price)}</s>` : ""}` : "Narxi so‘rov bo‘yicha";

export const skeletonCards = (n) =>
  Array.from({ length: n }, () => '<div><div class="card-media skeleton"></div></div>').join("");

/* ---------- Kichik UI yordamchilari ---------- */
let toastTimer;
export function toast(html, ms = 3200) {
  const el = $("#toast");
  el.innerHTML = html;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

export function reveal(root = document) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 }
  );
  $$(".reveal:not(.in)", root).forEach((el) => io.observe(el));
}

// Gorizontal karusel: [data-rail] ichidagi .rail ni strelkalar bilan aylantiradi
export function rails(root = document) {
  $$("[data-rail]", root).forEach((box) => {
    const rail = $(".rail", box);
    const [prev, next] = [$("[data-prev]", box), $("[data-next]", box)];
    if (!rail || !prev || !next) return;
    const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 300) + 14;
    const sync = () => {
      prev.disabled = rail.scrollLeft < 8;
      next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
    };
    prev.onclick = () => rail.scrollBy({ left: -step() * 2 });
    next.onclick = () => rail.scrollBy({ left: step() * 2 });
    rail.addEventListener("scroll", sync, { passive: true });
    sync();
  });
}

let categoriesPromise;
export function getCategories() {
  categoriesPromise ??= api("/categories").then((list) => list.filter((c) => c.count > 0));
  return categoriesPromise;
}

/* ---------- Overlaylar ---------- */
let opened = null;
export function openOverlay(name) {
  closeOverlay();
  const el = $(`#${name}`);
  if (!el) return;
  opened = el;
  el.classList.add("open");
  $("#backdrop").classList.add("open");
  document.body.classList.add("locked");
  if (name === "search") setTimeout(() => $("#search input").focus(), 80);
}
export function closeOverlay() {
  if (!opened) return;
  opened.classList.remove("open");
  $("#backdrop").classList.remove("open");
  document.body.classList.remove("locked");
  opened = null;
}

function renderCart() {
  const body = $("#cart .drawer-body");
  const foot = $("#cart .drawer-foot");
  $$("[data-cart-count]").forEach((el) => {
    el.textContent = cart.count;
    el.hidden = cart.count === 0;
  });
  if (!cart.items.length) {
    body.innerHTML = `
      <div class="empty" style="padding:70px 0">
        <h2 class="serif">Savat bo‘sh</h2>
        <p>Yoqqan modelni tanlang — razmerini belgilab savatga qo‘shing.</p>
        <a class="btn btn-dark" href="/catalog">Katalogga o‘tish</a>
      </div>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;
  body.innerHTML = cart.items.map((i) => lineItem(i)).join("");
  $("#cart-total").textContent = money(cart.total);
}

export function lineItem(i, editable = true) {
  return `
    <div class="line-item">
      <a href="/catalog/${esc(i.slug)}"><img src="${esc(i.image)}" alt="" loading="lazy"></a>
      <div>
        <h4><a href="/catalog/${esc(i.slug)}">${esc(i.title)}</a></h4>
        <div class="meta">Razmer: ${i.size === NO_SIZE ? "kelishiladi" : esc(i.size)}${editable ? "" : ` · ${i.qty} dona`}</div>
        <div class="row">
          ${
            editable
              ? `<div class="qty">
                   <button type="button" data-qty="-1" data-id="${i.id}" data-size="${esc(i.size)}" aria-label="Kamaytirish">−</button>
                   <span>${i.qty}</span>
                   <button type="button" data-qty="1" data-id="${i.id}" data-size="${esc(i.size)}" aria-label="Ko‘paytirish">+</button>
                 </div>`
              : "<span></span>"
          }
          <span>${money(i.price * i.qty)}</span>
        </div>
        ${editable ? `<button type="button" class="remove" data-remove data-id="${i.id}" data-size="${esc(i.size)}" style="margin-top:10px">O‘chirish</button>` : ""}
      </div>
    </div>`;
}

function initSearch() {
  const input = $("#search input");
  const results = $("#search .results");
  let timer;
  let seq = 0;

  const idle = async () => {
    const cats = await getCategories().catch(() => []);
    results.innerHTML = `
      <div class="kicker muted">Ko‘p qidiriladi</div>
      <div class="quick">${cats.map((c) => `<a class="chip" href="/catalog?category=${esc(c.slug)}">${esc(c.name)}</a>`).join("")}</div>`;
  };
  idle();

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return idle();
    timer = setTimeout(async () => {
      const mine = ++seq;
      try {
        const { items, total } = await api(`/products?q=${encodeURIComponent(q)}&limit=8`);
        if (mine !== seq) return;
        results.innerHTML = items.length
          ? `<div class="grid">${items.map(card).join("")}</div>
             ${total > items.length ? `<p style="margin-top:28px;text-align:center"><a class="caps underline" href="/catalog?q=${encodeURIComponent(q)}">Barcha natijalar — ${total} ta</a></p>` : ""}`
          : `<p class="muted">“${esc(q)}” bo‘yicha hech narsa topilmadi. Boshqa so‘z bilan urinib ko‘ring.</p>`;
      } catch {
        results.innerHTML = '<p class="muted">Qidiruvda xatolik. Qayta urinib ko‘ring.</p>';
      }
    }, 220);
  });

  $("#search form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) location.href = `/catalog?q=${encodeURIComponent(q)}`;
  });
}

/* ---------- Layout ---------- */
const wordmark = 'DOSS<i>_</i>UZ';

export function mountLayout({ active = "", overHero = false } = {}) {
  const nav = [
    ["/catalog", "Katalog", "catalog"],
    ["/catalog?only=new", "Yangi kolleksiya", "new"],
    ["/contacts", "Do‘kon", "contacts"],
  ];

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="promo">
      <span>${esc(site.delivery)}</span>
      <span class="dot wide"></span><span class="wide">${esc(site.hours)}</span>
      <span class="dot wide"></span><a class="wide" href="${site.phoneHref}">${esc(site.phone)}</a>
    </div>
    <header class="header${overHero ? " over" : ""}" id="header">
      <div class="side">
        <button class="icon-btn" type="button" data-open="menu" aria-label="Menyu">${icons.menu}</button>
        <nav class="caps" aria-label="Asosiy navigatsiya">
          ${nav.map(([href, label, key]) => `<a href="${href}" class="${key === active ? "active" : ""}">${label}</a>`).join("")}
        </nav>
      </div>
      <a class="wordmark" href="/" aria-label="${site.name} — bosh sahifa">${wordmark}</a>
      <div class="side right">
        <button class="icon-btn" type="button" data-open="search" aria-label="Qidiruv">${icons.search}</button>
        <a class="icon-btn" href="/favorites" aria-label="Sevimlilar">${icons.heart.replace('width="18" height="18"', 'width="20" height="20"')}<span class="count" data-fav-count hidden></span></a>
        <button class="icon-btn" type="button" data-open="cart" aria-label="Savat">${icons.bag}<span class="count" data-cart-count hidden></span></button>
      </div>
    </header>`
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <footer class="footer">
      <div class="wrap">
        <div class="cols">
          <div>
            <a class="wordmark" href="/">${wordmark}</a>
            <p style="margin-top:18px;max-width:320px">${esc(site.tagline)}. Erkaklar uchun premium kiyimlar — ${esc(site.season)} kolleksiyasi.</p>
          </div>
          <div>
            <h4>Katalog</h4>
            <ul id="footer-cats"><li><a href="/catalog">Barcha mahsulotlar</a></li></ul>
          </div>
          <div>
            <h4>Xaridorlarga</h4>
            <ul>
              <li><a href="/catalog?only=new">Yangi kolleksiya</a></li>
              <li><a href="/favorites">Sevimlilar</a></li>
              <li><a href="/checkout">Buyurtma berish</a></li>
              <li><a href="/contacts">Do‘kon manzili</a></li>
            </ul>
          </div>
          <div>
            <h4>Aloqa</h4>
            <ul>
              <li><a href="${site.phoneHref}">${esc(site.phone)}</a></li>
              <li><a href="${site.telegram}" target="_blank" rel="noopener">Telegram: ${esc(site.telegramHandle)}</a></li>
              <li>${esc(site.city)}, ${esc(site.address)}</li>
              <li>${esc(site.hours)}</li>
            </ul>
          </div>
        </div>
        <div class="legal">
          <span>© ${new Date().getFullYear()} ${esc(site.name)}. Barcha huquqlar himoyalangan.</span>
          <span>${esc(site.delivery)}</span>
        </div>
      </div>
    </footer>

    <div class="backdrop" id="backdrop"></div>

    <aside class="drawer left" id="menu" aria-label="Menyu">
      <div class="drawer-head"><span class="wordmark" style="font-size:20px">${wordmark}</span><button class="icon-btn" type="button" data-close aria-label="Yopish">${icons.close}</button></div>
      <div class="drawer-body">
        <nav class="menu-links" id="menu-links">
          <a href="/catalog">Barcha mahsulotlar</a>
          <a href="/catalog?only=new">Yangi kolleksiya</a>
        </nav>
        <div class="menu-meta">
          <a href="/favorites">Sevimlilar</a>
          <a href="/contacts">Do‘kon va aloqa</a>
          <a href="${site.phoneHref}">${esc(site.phone)}</a>
          <a href="${site.telegram}" target="_blank" rel="noopener">Telegram ${esc(site.telegramHandle)}</a>
          <span>${esc(site.hours)}</span>
        </div>
      </div>
    </aside>

    <aside class="drawer right" id="cart" aria-label="Savat">
      <div class="drawer-head"><span class="caps">Savat</span><button class="icon-btn" type="button" data-close aria-label="Yopish">${icons.close}</button></div>
      <div class="drawer-body"></div>
      <div class="drawer-foot">
        <div class="total-row"><span>Jami</span><b id="cart-total"></b></div>
        <a class="btn btn-dark btn-block" href="/checkout">Buyurtma berish</a>
        <p class="muted" style="margin-top:12px;font-size:12.5px;text-align:center">Buyurtmadan so‘ng menejer siz bilan bog‘lanadi</p>
      </div>
    </aside>

    <div class="search" id="search" role="dialog" aria-label="Qidiruv">
      <div class="wrap">
        <form>
          ${icons.search}
          <input type="search" placeholder="Nimani qidiryapsiz?" autocomplete="off" aria-label="Qidiruv so‘zi">
          <button class="icon-btn" type="button" data-close aria-label="Yopish">${icons.close}</button>
        </form>
        <div class="results"></div>
      </div>
    </div>

    <div class="toast" id="toast" role="status"></div>`
  );

  // Header: hero ustida shaffof, pastga tushganda oq fon
  if (overHero) {
    const header = $("#header");
    const onScroll = () => header.classList.toggle("over", window.scrollY < window.innerHeight * 0.72);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Global bosishlar
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open],[data-close],[data-fav],[data-qty],[data-remove],#backdrop");
    if (!t) return;
    if (t.id === "backdrop" || t.hasAttribute("data-close")) return closeOverlay();
    if (t.dataset.open) return openOverlay(t.dataset.open);
    if (t.dataset.fav) {
      e.preventDefault();
      const on = favs.toggle(Number(t.dataset.fav));
      $$(`[data-fav="${t.dataset.fav}"]`).forEach((b) => b.setAttribute("aria-pressed", on));
      toast(on ? 'Sevimlilarga qo‘shildi <a href="/favorites">Ko‘rish</a>' : "Sevimlilardan olib tashlandi");
      return;
    }
    const id = Number(t.dataset.id);
    if (t.dataset.qty) {
      const item = cart.items.find((i) => i.id === id && i.size === t.dataset.size);
      if (item) cart.setQty(id, t.dataset.size, item.qty + Number(t.dataset.qty));
    } else if (t.hasAttribute("data-remove")) {
      cart.remove(id, t.dataset.size);
    }
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeOverlay());

  // Kartochka ustiga sichqoncha kelganda ikkinchi rasm ko'rinadi (faqat shunda yuklanadi)
  document.addEventListener(
    "pointerenter",
    (e) => {
      if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
      const media = e.target;
      if (!media.matches(".card-media[data-alt]")) return;
      let alt = $("img.alt", media);
      if (!alt) {
        alt = Object.assign(new Image(), { className: "alt", alt: "", src: media.dataset.alt });
        media.append(alt);
      }
      const show = () => media.matches(":hover") && alt.classList.add("on");
      if (alt.complete) show();
      else alt.addEventListener("load", show, { once: true });
      media.addEventListener("pointerleave", () => alt.classList.remove("on"), { once: true });
    },
    true
  );

  const syncFavs = () =>
    $$("[data-fav-count]").forEach((el) => {
      el.textContent = favs.ids.length;
      el.hidden = favs.ids.length === 0;
    });
  document.addEventListener("cart:change", renderCart);
  document.addEventListener("favs:change", syncFavs);
  window.addEventListener("storage", () => location.reload());
  renderCart();
  syncFavs();
  initSearch();

  getCategories()
    .then((cats) => {
      $("#menu-links").insertAdjacentHTML(
        "beforeend",
        cats.map((c) => `<a href="/catalog?category=${esc(c.slug)}">${esc(c.name)} <small>${c.count}</small></a>`).join("")
      );
      $("#footer-cats").insertAdjacentHTML(
        "beforeend",
        cats.slice(0, 6).map((c) => `<li><a href="/catalog?category=${esc(c.slug)}">${esc(c.name)}</a></li>`).join("")
      );
    })
    .catch(() => {});
}
