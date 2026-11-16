// Bazani yaratadi, jadvallarni o'rnatadi va admin foydalanuvchini sozlaydi.
//   npm run db:setup
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import argon2 from "argon2";
import { env } from "../config/env.js";

// 1) Baza mavjud bo'lmasa — yaratamiz (hostingda baza tayyor beriladi, bu qadam o'tkazib yuboriladi)
if (!env.db.connectionString) {
  const { database, ...server } = env.db;
  const root = new pg.Client({ ...server, database: "postgres" });
  await root.connect();
  const exists = await root.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (!exists.rowCount) {
    await root.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
    console.log(`Baza yaratildi: ${database}`);
  }
  await root.end();
}

// 2) Jadvallar
const db = new pg.Client(env.db);
await db.connect();
await db.query(fs.readFileSync(path.join(import.meta.dirname, "schema.sql"), "utf8"));
console.log("Jadvallar tayyor");

// 3) Admin
if (!env.admin.password) {
  console.warn(".env da ADMIN_PASSWORD yo'q — admin yaratilmadi");
} else {
  const hash = await argon2.hash(env.admin.password);
  await db.query(
    `INSERT INTO admins (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [env.admin.username, hash]
  );
  console.log(`Admin tayyor: ${env.admin.username}`);
}
await db.end();
