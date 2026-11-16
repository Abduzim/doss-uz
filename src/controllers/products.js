import * as service from "../services/products.js";
import { HttpError } from "../utils/error.js";

const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "ID noto‘g‘ri");
  return id;
};

export const categories = async (req, res) => res.json(await service.listCategories());

export const list = async (req, res) => res.json(await service.listProducts(req.valid));

export const bySlug = async (req, res) => res.json(await service.getProductBySlug(req.params.slug));

// --- admin ---
export const adminList = async (req, res) =>
  res.json(await service.listProducts({ ...req.valid, limit: 200 }, { includeInactive: true }));

export const adminOne = async (req, res) => res.json(await service.getProductById(idParam(req)));

export const create = async (req, res) => res.status(201).json(await service.createProduct(req.valid));

export const update = async (req, res) => res.json(await service.updateProduct(idParam(req), req.valid));

export const remove = async (req, res) => {
  await service.deleteProduct(idParam(req));
  res.status(204).end();
};
