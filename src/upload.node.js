// Admin panel orqali fayl yuklash — faqat Node.js serverda (diskka yozadi, ffmpeg ishlatadi).
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { HttpError } from "./utils/error.js";
import { makeVideoExtras } from "./utils/media.js";

export const UPLOAD_DIR = path.resolve(import.meta.dirname, "..", "uploads");

const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4" };

const receive = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_DIR, "admin"),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 80 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new HttpError(400, "Faqat JPG, PNG, WEBP yoki MP4 yuklash mumkin")),
}).array("files", 12);

async function respond(req, res) {
  const url = (file) => (file ? `/media/admin/${path.basename(file)}` : null);
  const files = [];
  for (const f of req.files || []) {
    if (!f.mimetype.startsWith("video/")) {
      files.push({ kind: "image", url: url(f.path) });
      continue;
    }
    // Video uchun muqova kadri va qisqa preview avtomatik yasaladi
    const extras = await makeVideoExtras(f.path);
    files.push({ kind: "video", url: url(f.path), poster_url: url(extras.poster), preview_url: url(extras.preview) });
  }
  res.status(201).json(files);
}

export const upload = [receive, respond];
