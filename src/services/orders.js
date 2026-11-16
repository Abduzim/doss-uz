import { query, transaction } from "../config/db.js";
import { HttpError, notFound } from "../utils/error.js";
import { notifyNewOrder } from "../utils/telegram.js";
import { env } from "../config/env.js";
import { site } from "../data/site.js";

export async function createOrder(data) {
  if (!env.hasDb) {
    throw new HttpError(503, `Onlayn buyurtma hozircha yoqilmagan. Buyurtma uchun qo‘ng‘iroq qiling: ${site.phone}`);
  }
  if (data.delivery === "delivery" && !data.address) {
    throw new HttpError(400, "Yetkazib berish manzilini kiriting");
  }

  const order = await transaction(async (client) => {
    // Narx har doim bazadan olinadi — brauzerdan kelgan narxga ishonilmaydi
    const ids = [...new Set(data.items.map((i) => i.product_id))];
    const { rows: products } = await client.query(
      "SELECT id, title, price, sizes FROM products WHERE id = ANY($1::int[]) AND is_active",
      [ids]
    );
    const byId = new Map(products.map((p) => [p.id, p]));

    const items = data.items.map((item) => {
      const p = byId.get(item.product_id);
      if (!p) throw new HttpError(400, "Savatdagi mahsulotlardan biri sotuvda qolmagan");
      if (!p.price) {
        throw new HttpError(400, `"${p.title}" narxi hali belgilanmagan — Telegram orqali so‘rang`);
      }
      if (p.sizes.length && !p.sizes.includes(item.size)) {
        throw new HttpError(400, `"${p.title}" uchun ${item.size} razmeri mavjud emas`);
      }
      return { product_id: p.id, title: p.title, price: p.price, size: item.size, quantity: item.quantity };
    });
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const { rows } = await client.query(
      `INSERT INTO orders (customer_name, phone, region, address, comment, delivery, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.customer_name, data.phone, data.region, data.address, data.comment, data.delivery, total]
    );
    for (const i of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, title, price, size, quantity)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rows[0].id, i.product_id, i.title, i.price, i.size, i.quantity]
      );
    }
    return { ...rows[0], items };
  });

  // Kutamiz: Cloudflare Workers javobdan keyin qolgan ishlarni to'xtatib qo'yadi.
  // notifyNewOrder xato tashlamaydi va ko'pi bilan 4 soniya kutadi.
  await notifyNewOrder(order);
  return order;
}

export async function listOrders({ status } = {}) {
  const { rows } = await query(
    `SELECT o.*,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'product_id', i.product_id, 'title', i.title, 'price', i.price,
                       'size', i.size, 'quantity', i.quantity
                     ) ORDER BY i.id)
              FROM order_items i WHERE i.order_id = o.id
            ), '[]') AS items
     FROM orders o
     WHERE $1::text IS NULL OR o.status = $1
     ORDER BY o.created_at DESC
     LIMIT 500`,
    [status || null]
  );
  return rows;
}

export async function setOrderStatus(id, status) {
  const { rows } = await query("UPDATE orders SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
  if (!rows[0]) throw notFound("Buyurtma");
  return rows[0];
}

export async function stats() {
  const { rows } = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM products WHERE is_active)                       AS products,
      (SELECT COUNT(*)::int FROM orders)                                         AS orders,
      (SELECT COUNT(*)::int FROM orders WHERE status = 'new')                    AS new_orders,
      (SELECT COALESCE(SUM(total), 0)::bigint FROM orders WHERE status <> 'cancelled') AS revenue
  `);
  return rows[0];
}
