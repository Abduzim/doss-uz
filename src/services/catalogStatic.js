// Baza ulanmagan holat uchun zaxira: katalog to'g'ridan-to'g'ri src/data/catalog.js dan o'qiladi.
// Sayt ko'rish uchun to'liq ishlaydi; buyurtma va admin panel esa bazani talab qiladi.
// ID lar `npm run db:seed` beradigan tartib bilan bir xil (1, 2, 3, ...).
import { categories, products, NEW_SINCE } from "../data/catalog.js";
import { buildMedia } from "../data/media.js";
import { notFound } from "../utils/error.js";
import { slugify } from "../utils/slug.js";

const categoryList = categories.map((c, i) => ({ id: i + 1, ...c }));
const categoryBySlug = new Map(categoryList.map((c) => [c.slug, c]));

const all = products.map((p, i) => {
  const category = categoryBySlug.get(p.category);
  const publishedAt = new Date(`${p.date}T12:00:00+05:00`);
  publishedAt.setMinutes(i);
  return {
    id: i + 1,
    slug: slugify(p.title),
    title: p.title,
    price: p.price,
    old_price: null,
    sizes: p.sizes,
    material: p.material,
    brand: p.brand,
    description: p.description,
    features: p.features,
    is_new: p.date >= NEW_SINCE,
    is_featured: p.featured,
    is_active: true,
    published_at: publishedAt.toISOString(),
    category_id: category.id,
    category_slug: category.slug,
    category_name: category.name,
    media: buildMedia(p).map((m) => ({
      kind: m.kind,
      url: m.url,
      poster_url: m.poster_url ?? null,
      preview_url: m.preview_url ?? null,
    })),
  };
});

const newest = (a, b) => b.published_at.localeCompare(a.published_at) || b.id - a.id;
const SORT = {
  new: newest,
  price_asc: (a, b) => a.price - b.price || b.id - a.id,
  price_desc: (a, b) => b.price - a.price || b.id - a.id,
};

export function listCategories() {
  return categoryList.map((c) => {
    const items = all.filter((p) => p.category_id === c.id);
    const lead = [...items].sort((a, b) => b.is_featured - a.is_featured || newest(a, b))[0];
    return { id: c.id, slug: c.slug, name: c.name, description: c.description, count: items.length, cover: lead?.media[0]?.url ?? null };
  });
}

export function listProducts(f) {
  const q = f.q?.toLowerCase();
  const ids = f.ids?.split(",").map(Number);
  const items = all
    .filter(
      (p) =>
        (!f.category || p.category_slug === f.category) &&
        (!f.size || p.sizes.includes(f.size)) &&
        (f.min == null || p.price >= f.min) &&
        (f.max == null || p.price <= f.max) &&
        (f.only !== "new" || p.is_new) &&
        (f.only !== "featured" || p.is_featured) &&
        (!ids || ids.includes(p.id)) &&
        (!q || [p.title, p.material, p.brand, p.description, p.category_name].some((s) => s.toLowerCase().includes(q)))
    )
    .sort(SORT[f.sort] || SORT.new);
  const offset = f.offset ?? 0;
  return { total: items.length, items: items.slice(offset, offset + (f.limit ?? 120)) };
}

export function getProductBySlug(slug) {
  const product = all.find((p) => p.slug === slug);
  if (!product) throw notFound("Mahsulot");
  const related = all
    .filter((p) => p.id !== product.id)
    .sort(
      (a, b) =>
        (b.category_id === product.category_id) - (a.category_id === product.category_id) ||
        Math.abs(a.price - product.price) - Math.abs(b.price - product.price) ||
        newest(a, b)
    )
    .slice(0, 8);
  return { ...product, related };
}
