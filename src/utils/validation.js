import Joi from "joi";

const SIZE = Joi.string().trim().uppercase().max(10);
const PHONE = Joi.string()
  .trim()
  .pattern(/^\+?[0-9\s\-()]{9,20}$/)
  .messages({ "string.pattern.base": "Telefon raqami noto‘g‘ri" });

export const productListQuery = Joi.object({
  category: Joi.string().trim().max(60),
  size: SIZE,
  q: Joi.string().trim().max(80).allow(""),
  sort: Joi.string().valid("new", "price_asc", "price_desc").default("new"),
  min: Joi.number().integer().min(0),
  max: Joi.number().integer().min(0),
  only: Joi.string().valid("new", "featured"),
  ids: Joi.string().pattern(/^\d+(,\d+)*$/),
  limit: Joi.number().integer().min(1).max(200).default(120),
  offset: Joi.number().integer().min(0).default(0),
});

export const orderBody = Joi.object({
  customer_name: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Ismingizni kiriting",
    "string.min": "Ismingizni kiriting",
    "any.required": "Ismingizni kiriting",
  }),
  phone: PHONE.required().messages({ "any.required": "Telefon raqamini kiriting", "string.empty": "Telefon raqamini kiriting" }),
  delivery: Joi.string().valid("delivery", "pickup").default("delivery"),
  region: Joi.string().trim().max(80).allow("").default(""),
  address: Joi.string().trim().max(400).allow("").default(""),
  comment: Joi.string().trim().max(600).allow("").default(""),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        size: SIZE.required(),
        quantity: Joi.number().integer().min(1).max(20).default(1),
      })
    )
    .min(1)
    .max(40)
    .required()
    .messages({ "array.min": "Savat bo‘sh" }),
});

export const loginBody = Joi.object({
  username: Joi.string().trim().max(60).required(),
  password: Joi.string().max(200).required(),
});

const mediaItem = Joi.object({
  kind: Joi.string().valid("image", "video").required(),
  url: Joi.string().trim().max(500).required(),
  poster_url: Joi.string().trim().max(500).allow(null, ""),
  preview_url: Joi.string().trim().max(500).allow(null, ""),
});

export const productBody = Joi.object({
  title: Joi.string().trim().min(2).max(160).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(120).allow(""),
  category_id: Joi.number().integer().positive().required(),
  price: Joi.number().integer().min(0).required(),
  old_price: Joi.number().integer().min(0).allow(null),
  sizes: Joi.array().items(SIZE).default([]),
  material: Joi.string().trim().max(120).allow("").default(""),
  brand: Joi.string().trim().max(80).allow("").default(""),
  description: Joi.string().trim().max(4000).allow("").default(""),
  features: Joi.array().items(Joi.string().trim().max(200)).default([]),
  is_new: Joi.boolean().default(false),
  is_featured: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true),
  media: Joi.array().items(mediaItem).max(30).default([]),
});

export const orderStatusBody = Joi.object({
  status: Joi.string().valid("new", "confirmed", "shipped", "done", "cancelled").required(),
});
