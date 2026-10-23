import * as authService from './auth.service.js';

export const register = async (req, res) => {
  const user = await authService.register(req.valid.body);

  return res.status(201).json({ user });
};

export const login = async (req, res) => {
  const { token, user } = await authService.login(req.valid.body);

  return res.status(200).json({ token, user });
};

export const me = async (req, res) => {
  const user = await authService.getProfile(req.auth.userId);

  return res.status(200).json({ user });
};

export const verifyEmail = async (req, res) => {
  const user = await authService.verifyEmail(req.valid.body.token);

  return res.status(200).json({ user });
};

export const resendVerification = async (req, res) => {
  await authService.resendVerification(req.valid.body.email);

  return res.status(200).json({
    message: 'Si el email existe y no está verificado, recibirás un nuevo enlace',
  });
};