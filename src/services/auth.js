import { env } from "../config/env.js";
import { HttpError } from "../utils/error.js";
import { safeEqual, signToken } from "../utils/token.js";

// Admin login/paroli sozlamalarda turadi: kompyuterda .env, Cloudflare'da sir (secret).
export async function login({ username, password }) {
  const admin = env.admin;
  if (!admin.password) throw new HttpError(503, "Admin paroli sozlanmagan (ADMIN_PASSWORD)");

  // Ikkala solishtiruv ham har doim bajariladi
  const okUser = safeEqual(username, admin.username);
  const okPass = safeEqual(password, admin.password);
  if (!okUser || !okPass) throw new HttpError(401, "Login yoki parol noto‘g‘ri");

  const token = signToken({ username: admin.username }, env.jwtSecret, 12 * 60 * 60);
  return { token, username: admin.username };
}
