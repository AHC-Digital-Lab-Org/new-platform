import * as authService from './auth.service.js';

export const register = async (req, res) => {
  const user = await authService.register(req.valid.body);

  return res.status(201).json({ user });
};

export const login = async (req, res) => {
  const result = await authService.login(req.valid.body);

  return res.status(200).json(result);
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

export const twoFactorSetup = async (req, res) => {
  const setup = await authService.setupTwoFactor(req.auth.userId);

  return res.status(200).json(setup);
};

export const twoFactorEnable = async (req, res) => {
  const { user, recoveryCodes } = await authService.enableTwoFactor(
    req.auth.userId,
    req.valid.body.code,
  );

  return res.status(200).json({ user, recoveryCodes });
};

export const twoFactorDisable = async (req, res) => {
  const user = await authService.disableTwoFactor(
    req.auth.userId,
    req.valid.body,
  );

  return res.status(200).json({ user });
};

export const twoFactorLogin = async (req, res) => {
  const result = await authService.loginWithTwoFactor(req.valid.body);

  return res.status(200).json(result);
};

export const twoFactorRecoveryCodes = async (req, res) => {
  const recoveryCodes = await authService.regenerateRecoveryCodes(
    req.auth.userId,
    req.valid.body,
  );

  return res.status(200).json({ recoveryCodes });
};