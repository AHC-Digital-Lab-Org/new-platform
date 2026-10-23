import { env } from '#infrastructure/config/env.js';

export const buildVerificationMail = (token) => {
  const link = `${env.frontendUrl}/verify-email?token=${token}`;

  return {
    subject: 'Verifica tu email',
    text: `Gracias por registrarte. Verifica tu email con este enlace (válido 24 horas):\n\n${link}\n\nSi no has sido tú, ignora este mensaje.`,
    html: `<p>Gracias por registrarte. Verifica tu email con este enlace (válido 24 horas):</p><p><a href="${link}">Verificar email</a></p><p>Si no has sido tú, ignora este mensaje.</p>`,
  };
};
