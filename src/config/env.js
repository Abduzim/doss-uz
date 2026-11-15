import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 4000,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_NAME || "doss_uz",
  },
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  admin: {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "",
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
};
