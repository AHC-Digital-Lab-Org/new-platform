import nodemailer from 'nodemailer';
import { env } from '#infrastructure/config/env.js';
import { logger } from '#infrastructure/logger/logger.js';

let transporter;

const getTransporter = () => {
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user
      ? { user: env.smtp.user, pass: env.smtp.pass }
      : undefined,
  });
  return transporter;
};

export const sendMail = async ({ to, subject, text, html }) => {
  if (!env.smtp.host) {
    if (env.nodeEnv === 'production') {
      throw new Error('SMTP no configurado');
    }
    logger.info(`[mail sin SMTP] Para: ${to} | ${subject}\n${text}`);
    return;
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });
};
