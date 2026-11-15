import { Router } from "express";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

import * as products from "../controllers/products.js";
import * as orders from "../controllers/orders.js";
import * as auth from "../controllers/auth.js";
import { validate } from "../middleware/validations.js";
import { requireAdmin } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { HttpError } from "../utils/error.js";
import * as v from "../utils/validation.js";
import { site } from "../data/site.js";

export const UPLOAD_DIR = path.resolve(import.meta.dirname, "..", "..", "uploads");

const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4" };
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_DIR, "admin"),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 80 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new HttpError(400, "Faqat JPG, PNG, WEBP yoki MP4 yuklash mumkin")),
});

const router = Router();

// --- ochiq API ---
router.get("/site", (req, res) => res.json(site));
router.get("/categories", products.categories);
router.get("/products", validate(v.productListQuery, "query"), products.list);
router.get("/products/:slug", products.bySlug);
router.post(
  "/orders",
  rateLimit({ windowMs: 10 * 60_000, max: 10, message: "Juda ko‘p buyurtma yuborildi, birozdan so‘ng urinib ko‘ring" }),
  validate(v.orderBody),
  orders.create
);

// --- admin ---
router.post(
  "/auth/login",
  rateLimit({ windowMs: 5 * 60_000, max: 8, message: "Juda ko‘p urinish, 5 daqiqadan so‘ng qayta urinib ko‘ring" }),
  validate(v.loginBody),
  auth.login
);
router.get("/auth/me", requireAdmin, auth.me);

const admin = Router();
admin.use(requireAdmin);
admin.get("/stats", orders.stats);
admin.get("/orders", orders.list);
admin.patch("/orders/:id", validate(v.orderStatusBody), orders.setStatus);
admin.get("/products", validate(v.productListQuery, "query"), products.adminList);
admin.get("/products/:id", products.adminOne);
admin.post("/products", validate(v.productBody), products.create);
admin.put("/products/:id", validate(v.productBody), products.update);
admin.delete("/products/:id", products.remove);
admin.post("/upload", upload.array("files", 12), products.upload);
router.use("/admin", admin);

export default router;
