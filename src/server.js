import express from "express";
import path from "node:path";
import fs from "node:fs";

import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import api, { UPLOAD_DIR } from "./routers/index.js";
import { apiNotFound, errorHandler } from "./middleware/error.js";
import { site } from "./data/site.js";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");
fs.mkdirSync(path.join(UPLOAD_DIR, "admin"), { recursive: true });

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// API
app.use("/api", api, apiNotFound);

// Media (rasm va videolar) — uzoq muddat keshlanadi
app.use("/media", express.static(UPLOAD_DIR, { maxAge: "30d", index: false, fallthrough: false }));

// Frontend. Do'kon ma'lumotlari (src/data/site.js) brauzerga ES modul sifatida beriladi
app.get("/js/site.js", (req, res) => {
  res.type("js").send(`export const site = ${JSON.stringify(site)};`);
});
// maxAge yo'q: brauzer har safar fayl o'zgarganini tekshiradi (ETag), eski CSS/JS qolib ketmaydi
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));
app.get("/catalog/:slug", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "product.html")));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html")));

app.use((err, req, res, next) => {
  // /media ichida topilmagan fayl
  if (err.status === 404 && !req.path.startsWith("/api")) return res.status(404).end();
  errorHandler(err, req, res, next);
});

const server = app.listen(env.port, () => {
  console.log(`DOSS_UZ → http://localhost:${env.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => pool.end().then(() => process.exit(0))));
}
