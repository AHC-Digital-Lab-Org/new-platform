import * as authService from './auth.service.js';

export const register = async (req, res) => {
  const user = await authService.register(req.valid.body);

  return res.status(201).json({ user });
};

export const login = async (_req, res) => {
  return res.status(501).json({ message: 'Not implemented yet' });
};