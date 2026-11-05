import { env } from '#infrastructure/config/env.js';

export const buildVerificationMail = (token) => {
  const link = `${env.frontendUrl}/verify-email?token=${token}`;

  return {
    subject: 'Verifica tu email',
    text: `Gracias por registrarte. Verifica tu email con este enlace (válido 24 horas):\n\n${link}\n\nSi no has sido tú, ignora este mensaje.`,
    html: `<p>Gracias por registrarte. Verifica tu email con este enlace (válido 24 horas):</p><p><a href="${link}">Verificar email</a></p><p>Si no has sido tú, ignora este mensaje.</p>`,
  };
};

export const buildPasswordResetMail = (token) => {
  const link = `${env.frontendUrl}/reset-password?token=${token}`;

  return {
    subject: 'Restablece tu contraseña',
    text: `Hemos recibido una solicitud para restablecer tu contraseña. Usa este enlace (válido 1 hora):\n\n${link}\n\nSi no has sido tú, ignora este mensaje: tu contraseña no cambiará.`,
    html: `<p>Hemos recibido una solicitud para restablecer tu contraseña. Usa este enlace (válido 1 hora):</p><p><a href="${link}">Restablecer contraseña</a></p><p>Si no has sido tú, ignora este mensaje: tu contraseña no cambiará.</p>`,
  };
};

export const buildPasswordChangedMail = () => ({
  subject: 'Tu contraseña ha sido cambiada',
  text: 'Tu contraseña ha sido cambiada y se han cerrado tus otras sesiones abiertas.\n\nSi no has sido tú, restablece tu contraseña de inmediato y contacta con soporte.',
  html: '<p>Tu contraseña ha sido cambiada y se han cerrado tus otras sesiones abiertas.</p><p>Si no has sido tú, restablece tu contraseña de inmediato y contacta con soporte.</p>',
});
