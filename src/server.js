// Node.js server: kompyuterda ishlab chiqish va oddiy hosting (VPS) uchun.
import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";

import { env } from "./config/env.js";
import { closePool } from "./config/db.js";
import { createApp } from "./app.js";
import { upload, UPLOAD_DIR } from "./upload.node.js";
import { site } from "./data/site.js";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");
fs.mkdirSync(path.join(UPLOAD_DIR, "admin"), { recursive: true });

const app = createApp({
  upload,
  frontend(app) {
    // Media (rasm va videolar) — uzoq muddat keshlanadi
    app.use("/media", express.static(UPLOAD_DIR, { maxAge: "30d", index: false, fallthrough: false }));

    // Do'kon ma'lumotlari (src/data/site.js) brauzerga ES modul sifatida beriladi
    app.get("/js/site.js", (req, res) => {
      res.type("js").send(`export const site = ${JSON.stringify(site)};`);
    });
    // maxAge yo'q: brauzer har safar fayl o'zgarganini tekshiradi (ETag), eski CSS/JS qolib ketmaydi
    app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));
    app.get("/catalog/:slug", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "product.html")));
    app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html")));

    // /media ichida topilmagan fayl — JSON emas, bo'sh 404
    app.use((err, req, res, next) => {
      if (err.status === 404 && req.path.startsWith("/media")) return res.status(404).end();
      next(err);
    });
  },
});

const server = app.listen(env.port, () => {
  console.log(`DOSS_UZ → http://localhost:${env.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => closePool().then(() => process.exit(0))));
}
