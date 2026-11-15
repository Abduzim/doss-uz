import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/error.js";

export async function login({ username, password }) {
  const { rows } = await query("SELECT * FROM admins WHERE username = $1", [username]);
  const admin = rows[0];
  const ok = admin && (await argon2.verify(admin.password_hash, password));
  if (!ok) throw new HttpError(401, "Login yoki parol noto‘g‘ri");

  const token = jwt.sign({ id: admin.id, username: admin.username }, env.jwtSecret, { expiresIn: "12h" });
  return { token, username: admin.username };
}
