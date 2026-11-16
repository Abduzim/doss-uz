import { HttpError } from "../utils/error.js";

export function apiNotFound(req, res) {
  res.status(404).json({ message: "Bunday manzil yo‘q" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Fayl yuklashda xato: ${err.message}` });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON noto‘g‘ri" });
  }
  const status = err.status || 500;
  // HttpError — o'zimiz ataylab tashlagan xato, matnini ko'rsatish xavfsiz
  const known = err instanceof HttpError;
  if (status >= 500 && !known) console.error(err);
  res.status(status).json({
    message: known || status < 500 ? err.message : "Serverda xatolik yuz berdi",
    details: err.details,
  });
}
