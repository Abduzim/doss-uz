import { env } from "../config/env.js";
import { HttpError } from "../utils/error.js";
import { verifyToken } from "../utils/token.js";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Avtorizatsiya talab qilinadi");
  const payload = verifyToken(token, env.jwtSecret);
  if (!payload) throw new HttpError(401, "Sessiya muddati tugagan, qayta kiring");
  req.admin = payload;
  next();
}
