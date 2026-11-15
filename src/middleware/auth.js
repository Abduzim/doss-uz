import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../utils/error.js";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Avtorizatsiya talab qilinadi");
  try {
    req.admin = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, "Sessiya muddati tugagan, qayta kiring");
  }
  next();
}
