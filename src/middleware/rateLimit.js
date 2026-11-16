import { HttpError } from "../utils/error.js";

// Oddiy xotiradagi limit: bitta IP dan `windowMs` ichida `max` ta so'rov.
// Taymer ishlatilmaydi (Cloudflare Workers'da global taymer taqiqlangan) —
// eskirgan yozuvlar so'rov kelganda tozalanadi.
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [key, rec] of hits) if (rec.reset < now) hits.delete(key);
    }
    const ip = req.headers["cf-connecting-ip"] || req.ip || "unknown";
    const rec = hits.get(ip);
    if (!rec || rec.reset < now) {
      hits.set(ip, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++rec.count > max) throw new HttpError(429, message);
    next();
  };
}
