import * as service from "../services/auth.js";

export const login = async (req, res) => res.json(await service.login(req.valid));

export const me = (req, res) => res.json({ username: req.admin.username });
