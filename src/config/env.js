// Sozlamalar process.env dan o'qiladi:
//  - kompyuterda: .env fayli (server.js / setup.js / seed.js boshida `dotenv/config` yuklaydi)
//  - Cloudflare Workers'da: wrangler.jsonc dagi vars va `wrangler secret put` bilan qo'yilgan sirlar
// Qiymatlar har safar so'ralganda o'qiladi, shuning uchun modul qachon yuklanganining ahamiyati yo'q.
const e = (name, fallback = "") => process.env[name] || fallback;

function dbConfig() {
  const url = e("DATABASE_URL");
  if (!url) {
    return {
      host: e("DB_HOST", "localhost"),
      port: Number(e("DB_PORT")) || 5432,
      user: e("DB_USER", "postgres"),
      password: e("DB_PASSWORD") || undefined,
      database: e("DB_NAME", "doss_uz"),
    };
  }
  // Bulutdagi bazalar (Neon va b.) TLS talab qiladi, lokal server odatda yo'q
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const ssl = e("DB_SSL") ? e("DB_SSL") === "true" : !local;
  return { connectionString: url, ssl: ssl ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10_000 };
}

export const env = {
  get port() {
    return Number(e("PORT")) || 4000;
  },
  get db() {
    return dbConfig();
  },
  // Baza sozlanganmi? Sozlanmagan bo'lsa katalog fayldan o'qiladi (services/catalogStatic.js)
  get hasDb() {
    return Boolean(e("DATABASE_URL") || e("DB_NAME"));
  },
  get jwtSecret() {
    return e("JWT_SECRET", "dev-secret-change-me");
  },
  get admin() {
    return { username: e("ADMIN_USERNAME", "admin"), password: e("ADMIN_PASSWORD") };
  },
  get telegram() {
    return { token: e("TELEGRAM_BOT_TOKEN"), chatId: e("TELEGRAM_CHAT_ID") };
  },
};
