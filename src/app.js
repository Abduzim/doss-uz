// Express ilovasi. Ikki joyda ishlatiladi:
//   src/server.js — kompyuterda / oddiy serverda (Node.js)
//   src/worker.js — Cloudflare Workers'da
import express from "express";
import { createApi } from "./routers/index.js";
import { apiNotFound, errorHandler } from "./middleware/error.js";

// upload   — fayl yuklash middleware'lari (faqat Node.js)
// frontend — statik fayllar va sahifalarni ulaydigan funksiya (faqat Node.js;
//            Cloudflare'da ularni platformaning o'zi beradi)
export function createApp({ upload, frontend } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "200kb" }));

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use("/api", createApi({ upload }), apiNotFound);
  frontend?.(app);
  app.use(errorHandler);
  return app;
}
