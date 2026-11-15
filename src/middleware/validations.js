import { HttpError } from "../utils/error.js";

// Joi sxemasi bo'yicha req.body yoki req.query ni tekshiradi.
// Tozalangan qiymat req.valid ga yoziladi (Express 5 da req.query faqat o'qish uchun).
export const validate = (schema, source = "body") => (req, res, next) => {
  const { value, error } = schema.validate(req[source] ?? {}, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    throw new HttpError(
      400,
      error.details[0].message,
      error.details.map((d) => ({ field: d.path.join("."), message: d.message }))
    );
  }
  req.valid = value;
  next();
};
