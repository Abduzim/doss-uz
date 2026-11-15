import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool(env.db);

export const query = (text, params) => pool.query(text, params);

// Bir nechta so'rovni bitta tranzaksiyada bajarish
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
