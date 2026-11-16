import pg from "pg";
import { env } from "./env.js";
import { HttpError } from "../utils/error.js";

// Cloudflare Workers ulanishni so'rovlar orasida saqlay olmaydi, shuning uchun u yerda
// har bir ish uchun alohida ulanish ochiladi. Node.js da umumiy pool ishlatiladi.
const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

let pool;

// fn ga bitta ulanish beradi: bir nechta so'rovni ketma-ket shu ulanishda bajarish uchun
export async function withClient(fn) {
  if (!env.hasDb) throw new HttpError(503, "Baza ulanmagan — bu amal hozircha ishlamaydi");
  if (onWorkers) {
    const client = new pg.Client(env.db);
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.end().catch(() => {});
    }
  }
  pool ??= new pg.Pool({ ...env.db, max: 5, idleTimeoutMillis: 30_000 });
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export const query = (text, params) => withClient((client) => client.query(text, params));

// Bir nechta so'rovni bitta tranzaksiyada bajarish
export function transaction(fn) {
  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    }
  });
}

export const closePool = async () => {
  await pool?.end();
  pool = undefined;
};
