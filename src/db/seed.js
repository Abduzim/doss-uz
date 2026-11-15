// src/data/catalog.js dagi katalogni bazaga yozadi (slug bo'yicha yangilaydi).
//   npm run db:seed
import fs from "node:fs";
import path from "node:path";
import { pool, transaction } from "../config/db.js";
import { slugify } from "../utils/slug.js";
import { categories, products } from "../data/catalog.js";

const UPLOADS = path.resolve(import.meta.dirname, "..", "..", "uploads");
const NEW_SINCE = "2026-10-26"; // shu sanadan keyingi modellar "Yangi" belgisini oladi

const imageUrl = (ref) => (ref.startsWith("p") ? `/media/photo/${ref}.jpg` : `/media/poster/${ref}.jpg`);
const missing = [];
const check = (url) => {
  if (!fs.existsSync(path.join(UPLOADS, url.replace(/^\/media\//, "")))) missing.push(url);
  return url;
};

function buildMedia(p) {
  const media = [{ kind: "image", url: check(imageUrl(p.cover)) }];
  const [main, ...rest] = p.videos;

  for (const v of p.videos) {
    const poster = v === main && p.cover.startsWith(`${v}-`) ? p.cover : `${v}-2`;
    media.push({
      kind: "video",
      url: check(`/media/video/${v}.mp4`),
      poster_url: check(imageUrl(poster)),
      preview_url: check(`/media/preview/${v}.mp4`),
    });
  }
  for (const ph of p.photos) media.push({ kind: "image", url: check(imageUrl(ph)) });

  // Videodan olingan kadrlar galereyani to'ldiradi
  const frames = [];
  if (main) for (const n of [2, 1, 3, 4]) frames.push(`${main}-${n}`);
  for (const v of rest) frames.push(`${v}-2`, `${v}-4`);
  const room = Math.max(0, 5 - p.photos.length);
  for (const f of frames.filter((f) => f !== p.cover).slice(0, room)) {
    media.push({ kind: "image", url: check(imageUrl(f)) });
  }
  return media;
}

await transaction(async (db) => {
  const catId = new Map();
  for (const [i, c] of categories.entries()) {
    const { rows } = await db.query(
      `INSERT INTO categories (slug, name, description, sort) VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort = EXCLUDED.sort
       RETURNING id`,
      [c.slug, c.name, c.description, i]
    );
    catId.set(c.slug, rows[0].id);
  }

  const slugs = new Set();
  for (const [i, p] of products.entries()) {
    const slug = slugify(p.title);
    if (slugs.has(slug)) throw new Error(`Takroriy nom: ${p.title}`);
    slugs.add(slug);
    if (!catId.has(p.category)) throw new Error(`Kategoriya yo'q: ${p.category} (${p.title})`);

    // Bir kundagi postlar tartibi saqlanishi uchun daqiqa qo'shamiz
    const publishedAt = new Date(`${p.date}T12:00:00+05:00`);
    publishedAt.setMinutes(i);

    const { rows } = await db.query(
      `INSERT INTO products
         (slug, title, category_id, price, sizes, material, brand, description, features,
          is_new, is_featured, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title, category_id = EXCLUDED.category_id, price = EXCLUDED.price,
         sizes = EXCLUDED.sizes, material = EXCLUDED.material, brand = EXCLUDED.brand,
         description = EXCLUDED.description, features = EXCLUDED.features,
         is_new = EXCLUDED.is_new, is_featured = EXCLUDED.is_featured, published_at = EXCLUDED.published_at
       RETURNING id`,
      [
        slug, p.title, catId.get(p.category), p.price, p.sizes, p.material, p.brand,
        p.description, p.features, p.date >= NEW_SINCE, p.featured, publishedAt,
      ]
    );
    await db.query("DELETE FROM product_media WHERE product_id = $1", [rows[0].id]);
    for (const [sort, m] of buildMedia(p).entries()) {
      await db.query(
        `INSERT INTO product_media (product_id, kind, url, poster_url, preview_url, sort)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rows[0].id, m.kind, m.url, m.poster_url ?? null, m.preview_url ?? null, sort]
      );
    }
  }
});

console.log(`Katalog yuklandi: ${categories.length} ta kategoriya, ${products.length} ta mahsulot`);
if (missing.length) {
  console.warn(`Diqqat: ${missing.length} ta media fayl topilmadi (uploads/ papkasini tekshiring):`);
  console.warn(missing.slice(0, 10).join("\n"));
}
await pool.end();
