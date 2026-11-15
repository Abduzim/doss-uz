import { HttpError } from "../utils/error.js";

// Oddiy xotiradagi limit: bitta IP dan `windowMs` ichida `max` ta so'rov.
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of hits) if (rec.reset < now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const rec = hits.get(req.ip);
    if (!rec || rec.reset < now) {
      hits.set(req.ip, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++rec.count > max) throw new HttpError(429, message);
    next();
  };
}
