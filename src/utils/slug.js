// "Premium Ko‘jinniy Kurtka" → "premium-kojinniy-kurtka"
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, "")
    .replace(/&/g, " va ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
