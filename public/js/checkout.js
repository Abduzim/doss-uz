import { $, $$, api, cart, esc, icons, lineItem, money, mountLayout, site } from "/js/core.js";

mountLayout();

const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Andijon", "Buxoro", "Farg‘ona", "Jizzax", "Xorazm", "Namangan",
  "Navoiy", "Qashqadaryo", "Qoraqalpog‘iston", "Samarqand", "Sirdaryo", "Surxondaryo",
];

const view = $("#view");

function renderEmpty() {
  view.innerHTML = `
    <div class="empty">
      <h2 class="serif">Savat bo‘sh</h2>
      <p>Buyurtma berish uchun avval katalogdan model tanlang.</p>
      <a class="btn btn-dark" href="/catalog">Katalogga o‘tish</a>
    </div>`;
}

function renderSummary() {
  $("#items").innerHTML = cart.items.map((i) => lineItem(i, false)).join("");
  $("#total").textContent = money(cart.total);
}

if (!cart.items.length) {
  renderEmpty();
} else {
  $("#region").innerHTML = REGIONS.map((r) => `<option>${esc(r)}</option>`).join("");
  $("#pickup-note").textContent = `Do‘kon manzili: ${site.city}, ${site.address}. ${site.hours}.`;
  renderSummary();

  const form = $("#form");
  const setDelivery = () => {
    const pickup = form.delivery.value === "pickup";
    $("#delivery-fields").hidden = pickup;
    $("#pickup-note").hidden = !pickup;
  };
  form.addEventListener("change", (e) => e.target.name === "delivery" && setDelivery());
  setDelivery();

  const clearErrors = () => {
    $("#form-error").hidden = true;
    $$(".field.bad", form).forEach((f) => {
      f.classList.remove("bad");
      $(".err", f)?.remove();
    });
  };
  const fieldError = (name, message) => {
    const field = $(`[data-field="${name}"]`, form);
    if (!field) return false;
    field.classList.add("bad");
    field.insertAdjacentHTML("beforeend", `<div class="err">${esc(message)}</div>`);
    return true;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    const data = Object.fromEntries(new FormData(form));
    const pickup = data.delivery === "pickup";

    // Brauzer tomonida tezkor tekshiruv (server baribir qayta tekshiradi)
    const problems = [];
    if (data.customer_name.trim().length < 2) problems.push(["customer_name", "Ismingizni kiriting"]);
    if (data.phone.replace(/\D/g, "").length < 9) problems.push(["phone", "Telefon raqamini to‘liq kiriting"]);
    if (!pickup && !data.address.trim()) problems.push(["address", "Yetkazib berish manzilini kiriting"]);
    if (problems.length) {
      problems.forEach(([name, message]) => fieldError(name, message));
      $(".field.bad input, .field.bad textarea", form)?.focus();
      return;
    }

    const button = $("#submit");
    button.disabled = true;
    button.textContent = "Yuborilmoqda…";
    try {
      const order = await api("/orders", {
        method: "POST",
        body: {
          customer_name: data.customer_name,
          phone: data.phone,
          delivery: data.delivery,
          region: pickup ? "" : data.region,
          address: pickup ? "" : data.address,
          comment: data.comment,
          items: cart.items.map((i) => ({ product_id: i.id, size: i.size, quantity: i.qty })),
        },
      });
      cart.clear();
      view.innerHTML = `
        <div class="done">
          <div class="mark">${icons.check}</div>
          <div class="kicker muted">Buyurtma №${order.id}</div>
          <h1 class="serif" style="margin-top:12px">Rahmat, buyurtmangiz qabul qilindi</h1>
          <p>Jami: <b>${money(order.total)}</b>. Menejerimiz tez orada ${esc(data.phone)} raqamiga qo‘ng‘iroq qilib, buyurtmani tasdiqlaydi.
             Savollar bo‘lsa: <a class="underline" href="${site.phoneHref}">${esc(site.phone)}</a>.</p>
          <a class="btn btn-dark" href="/catalog">Xaridni davom ettirish</a>
        </div>`;
      window.scrollTo({ top: 0 });
    } catch (err) {
      const shown = (err.details || []).filter((d) => fieldError(d.field, d.message)).length;
      if (!shown) {
        $("#form-error").textContent = err.message;
        $("#form-error").hidden = false;
      }
      button.disabled = false;
      button.textContent = "Buyurtmani tasdiqlash";
    }
  });

  // Savat boshqa oynada o'zgarsa
  document.addEventListener("cart:change", () => (cart.items.length ? renderSummary() : null));
}
