// Bazani yaratadi va jadvallarni o'rnatadi.
//   npm run db:setup
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
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
await db.end();

// Admin login/paroli bazada emas, sozlamalarda turadi (ADMIN_USERNAME / ADMIN_PASSWORD)
if (!env.admin.password) console.warn("Diqqat: ADMIN_PASSWORD berilmagan — admin panelga kirib bo'lmaydi");
