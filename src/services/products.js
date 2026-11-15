import { query, transaction } from "../config/db.js";
import { HttpError, notFound } from "../utils/error.js";
import { slugify } from "../utils/slug.js";

const SELECT = `
  SELECT p.id, p.slug, p.title, p.price, p.old_price, p.sizes, p.material, p.brand,
         p.description, p.features, p.is_new, p.is_featured, p.is_active, p.published_at,
         p.category_id, c.slug AS category_slug, c.name AS category_name,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'kind', m.kind, 'url', m.url,
                    'poster_url', m.poster_url, 'preview_url', m.preview_url
                  ) ORDER BY m.sort, m.id)
           FROM product_media m WHERE m.product_id = p.id
         ), '[]') AS media
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

const ORDER = {
  new: "p.published_at DESC, p.id DESC",
  price_asc: "p.price ASC, p.id DESC",
  price_desc: "p.price DESC, p.id DESC",
};

export async function listCategories() {
  const { rows } = await query(`
    SELECT c.id, c.slug, c.name, c.description,
           COUNT(p.id)::int AS count,
           (SELECT COALESCE(m.poster_url, m.url)
              FROM products p2
              JOIN product_media m ON m.product_id = p2.id
             WHERE p2.category_id = c.id AND p2.is_active
             ORDER BY p2.is_featured DESC, p2.published_at DESC, m.sort
             LIMIT 1) AS cover
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active
    GROUP BY c.id
    ORDER BY c.sort, c.id
  `);
  return rows;
}

export async function listProducts(f, { includeInactive = false } = {}) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replaceAll("?", `$${params.length}`));
  };

  if (!includeInactive) where.push("p.is_active");
  if (f.category) add("c.slug = ?", f.category);
  if (f.size) add("? = ANY(p.sizes)", f.size);
  if (f.min != null) add("p.price >= ?", f.min);
  if (f.max != null) add("p.price <= ?", f.max);
  if (f.only === "new") where.push("p.is_new");
  if (f.only === "featured") where.push("p.is_featured");
  if (f.ids) add("p.id = ANY(?::int[])", f.ids.split(",").map(Number));
  if (f.q) {
    add(
      "(p.title ILIKE ? OR p.material ILIKE ? OR p.brand ILIKE ? OR p.description ILIKE ? OR c.name ILIKE ?)",
      `%${f.q.replace(/[%_\\]/g, "\\$&")}%`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await query(
    `SELECT COUNT(*)::int AS n FROM products p JOIN categories c ON c.id = p.category_id ${whereSql}`,
    params
  );
  const { rows } = await query(
    `${SELECT} ${whereSql} ORDER BY ${ORDER[f.sort] || ORDER.new}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, f.limit ?? 120, f.offset ?? 0]
  );
  return { total: total.rows[0].n, items: rows };
}

export async function getProductBySlug(slug) {
  const { rows } = await query(`${SELECT} WHERE p.slug = $1 AND p.is_active`, [slug]);
  if (!rows[0]) throw notFound("Mahsulot");
  const product = rows[0];
  const related = await query(
    `${SELECT} WHERE p.is_active AND p.id <> $1
     ORDER BY (p.category_id = $2) DESC, ABS(p.price - $3), p.published_at DESC
     LIMIT 8`,
    [product.id, product.category_id, product.price]
  );
  return { ...product, related: related.rows };
}

export async function getProductById(id) {
  const { rows } = await query(`${SELECT} WHERE p.id = $1`, [id]);
  if (!rows[0]) throw notFound("Mahsulot");
  return rows[0];
}

async function uniqueSlug(client, base, exceptId = null) {
  const root = slugify(base) || "mahsulot";
  let slug = root;
  for (let i = 2; ; i++) {
    const { rows } = await client.query(
      "SELECT 1 FROM products WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)",
      [slug, exceptId]
    );
    if (!rows.length) return slug;
    slug = `${root}-${i}`;
  }
}

async function replaceMedia(client, productId, media) {
  await client.query("DELETE FROM product_media WHERE product_id = $1", [productId]);
  for (const [i, m] of media.entries()) {
    await client.query(
      `INSERT INTO product_media (product_id, kind, url, poster_url, preview_url, sort)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [productId, m.kind, m.url, m.poster_url || null, m.preview_url || null, i]
    );
  }
}

async function assertCategory(client, id) {
  const { rows } = await client.query("SELECT 1 FROM categories WHERE id = $1", [id]);
  if (!rows.length) throw new HttpError(400, "Kategoriya topilmadi");
}

export async function createProduct(data) {
  const id = await transaction(async (client) => {
    await assertCategory(client, data.category_id);
    const slug = await uniqueSlug(client, data.slug || data.title);
    const { rows } = await client.query(
      `INSERT INTO products
         (slug, title, category_id, price, old_price, sizes, material, brand,
          description, features, is_new, is_featured, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        slug, data.title, data.category_id, data.price, data.old_price ?? null, data.sizes,
        data.material, data.brand, data.description, data.features,
        data.is_new, data.is_featured, data.is_active,
      ]
    );
    await replaceMedia(client, rows[0].id, data.media);
    return rows[0].id;
  });
  return getProductById(id);
}

export async function updateProduct(id, data) {
  await transaction(async (client) => {
    const exists = await client.query("SELECT slug FROM products WHERE id = $1", [id]);
    if (!exists.rows[0]) throw notFound("Mahsulot");
    await assertCategory(client, data.category_id);
    const slug = data.slug ? await uniqueSlug(client, data.slug, id) : exists.rows[0].slug;
    await client.query(
      `UPDATE products SET
         slug=$1, title=$2, category_id=$3, price=$4, old_price=$5, sizes=$6, material=$7,
         brand=$8, description=$9, features=$10, is_new=$11, is_featured=$12, is_active=$13
       WHERE id=$14`,
      [
        slug, data.title, data.category_id, data.price, data.old_price ?? null, data.sizes,
        data.material, data.brand, data.description, data.features,
        data.is_new, data.is_featured, data.is_active, id,
      ]
    );
    await replaceMedia(client, id, data.media);
  });
  return getProductById(id);
}

export async function deleteProduct(id) {
  const { rowCount } = await query("DELETE FROM products WHERE id = $1", [id]);
  if (!rowCount) throw notFound("Mahsulot");
}
