// Cloudflare Workers uchun yig'ish:  npm run build:cf
//
//   dist-cf/site/             — statik fayllar (public/ + kerakli media)
//   dist-cf/media-sizes.json  — video fayllar hajmi (worker.js Range so'rovlari uchun)
//
// Cloudflare bitta fayl uchun 25 MiB chegarasini qo'yadi; undan katta fayllar o'tkazib yuboriladi.
import fs from "node:fs";
import path from "node:path";
import { products } from "../src/data/catalog.js";
import { buildMedia } from "../src/data/media.js";
import { site } from "../src/data/site.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "dist-cf");
const SITE = path.join(OUT, "site");
const UPLOADS = path.join(ROOT, "uploads");
const MAX = 25 * 1024 * 1024;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });

// 1) Frontend
fs.cpSync(path.join(ROOT, "public"), SITE, { recursive: true });
fs.writeFileSync(path.join(SITE, "js", "site.js"), `export const site = ${JSON.stringify(site)};\n`);

// Brauzer keshi: media va shriftlar uzoq, qolganlari har safar tekshiriladi
fs.writeFileSync(
  path.join(SITE, "_headers"),
  ["/media/*", "  Cache-Control: public, max-age=2592000", "/fonts/*", "  Cache-Control: public, max-age=31536000, immutable", ""].join("\n")
);

// 2) Media: saytda haqiqatan ishlatiladigan fayllar.
//    Har bir mahsulotning faqat birinchi videosi ko'rsatiladi — qolganlari yuklanmaydi.
const wanted = new Set(["/media/hero/hero.mp4", "/media/hero/hero.jpg"]);
for (const p of products) {
  let seenVideo = false;
  for (const m of buildMedia(p)) {
    if (m.kind === "image") {
      wanted.add(m.url);
    } else if (!seenVideo) {
      seenVideo = true;
      wanted.add(m.url).add(m.poster_url).add(m.preview_url);
    }
  }
}
// Admin panel orqali yuklangan fayllar
const adminDir = path.join(UPLOADS, "admin");
if (fs.existsSync(adminDir)) for (const f of fs.readdirSync(adminDir)) wanted.add(`/media/admin/${f}`);

const sizes = {};
let total = 0;
const skipped = [];
for (const url of wanted) {
  const src = path.join(UPLOADS, url.replace(/^\/media\//, ""));
  if (!fs.existsSync(src)) {
    skipped.push(`${url} (topilmadi)`);
    continue;
  }
  const { size } = fs.statSync(src);
  if (size > MAX) {
    skipped.push(`${url} (${(size / 1048576).toFixed(1)} MB — 25 MB dan katta)`);
    continue;
  }
  const dest = path.join(SITE, url);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest, fs.constants.COPYFILE_FICLONE); // APFS da joy egallamaydigan nusxa
  if (url.endsWith(".mp4")) sizes[url] = size;
  total += size;
}

fs.writeFileSync(path.join(OUT, "media-sizes.json"), JSON.stringify(sizes));

const count = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile()).length;
console.log(`dist-cf/site tayyor: ${count(SITE)} ta fayl, media ${(total / 1048576).toFixed(0)} MB`);
if (skipped.length) console.warn(`O'tkazib yuborildi:\n  ${skipped.join("\n  ")}`);
