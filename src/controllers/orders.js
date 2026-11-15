import * as service from "../services/orders.js";
import { HttpError } from "../utils/error.js";

export const create = async (req, res) => {
  const order = await service.createOrder(req.valid);
  res.status(201).json({ id: order.id, total: order.total, items: order.items });
};

// --- admin ---
export const list = async (req, res) => res.json(await service.listOrders({ status: req.query.status }));

export const setStatus = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "ID noto‘g‘ri");
  res.json(await service.setOrderStatus(id, req.valid.status));
};

export const stats = async (req, res) => res.json(await service.stats());
