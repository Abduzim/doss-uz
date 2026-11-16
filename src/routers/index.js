import { Router } from "express";

import * as products from "../controllers/products.js";
import * as orders from "../controllers/orders.js";
import * as auth from "../controllers/auth.js";
import { validate } from "../middleware/validations.js";
import { requireAdmin } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { HttpError } from "../utils/error.js";
import * as v from "../utils/validation.js";
import { site } from "../data/site.js";

// upload — fayl yuklash middleware'lari. Faqat Node.js serverda beriladi (src/upload.node.js);
// Cloudflare Workers'da disk yo'q, shuning uchun u yerda yuklash o'chirilgan.
export function createApi({ upload } = {}) {
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
  if (upload) {
    admin.post("/upload", ...upload);
  } else {
    admin.post("/upload", () => {
      throw new HttpError(501, "Saytning internetdagi versiyasida fayl yuklash o‘chirilgan. Rasm va videolarni kompyuterdagi versiyada yuklang");
    });
  }
  router.use("/admin", admin);

  return router;
}
