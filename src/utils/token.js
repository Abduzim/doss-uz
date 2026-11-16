import crypto from "node:crypto";

// Kichik JWT (HS256) — Node.js da ham, Cloudflare Workers'da ham bir xil ishlaydi.
const b64 = (data) => Buffer.from(data).toString("base64url");
const mac = (text, secret) => crypto.createHmac("sha256", secret).update(text).digest("base64url");

export function signToken(payload, secret, ttlSeconds) {
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${head}.${body}.${mac(`${head}.${body}`, secret)}`;
}

// To'g'ri bo'lsa payload, aks holda null qaytaradi
export function verifyToken(token, secret) {
  const [head, body, signature] = String(token).split(".");
  if (!head || !body || !signature) return null;
  const expected = Buffer.from(mac(`${head}.${body}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

// Ikki satrni vaqt bo'yicha sizdirmasdan solishtirish (parol tekshiruvi uchun)
export function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
