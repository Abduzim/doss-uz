import multer from "multer";

export function apiNotFound(req, res) {
  res.status(404).json({ message: "Bunday manzil yo‘q" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Fayl yuklashda xato: ${err.message}` });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON noto‘g‘ri" });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? "Serverda xatolik yuz berdi" : err.message,
    details: err.details,
  });
}
