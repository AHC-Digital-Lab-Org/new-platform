import * as authService from './auth.service.js';

export const register = async (req, res) => {
  const user = await authService.register(req.valid.body);

  return res.status(201).json({ user });
};

export const login = async (req, res) => {
  const { token, user } = await authService.login(req.valid.body);

  return res.status(200).json({ token, user });
};