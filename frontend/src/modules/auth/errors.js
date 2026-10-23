export function formatWait(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds
    ? `${minutes} min ${remainingSeconds} s`
    : `${minutes} min`;
}

export function authErrorMessage(error) {
  if (!error) return '';

  switch (error.code) {
    case 'TOO_MANY_REQUESTS':
      return error.retryAfter
        ? `Demasiados intentos. Vuelve a intentarlo en ${formatWait(error.retryAfter)}.`
        : 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
    case 'INVALID_CREDENTIALS':
      return 'Email o contraseña incorrectos.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Debes verificar tu email antes de iniciar sesión. Revisa tu correo y pulsa el enlace de verificación.';
    case 'USER_ALREADY_EXISTS':
      return 'El email o el alias ya están en uso.';
    case 'VALIDATION_ERROR':
      return 'Revisa los datos del formulario.';
    default:
      return error.message;
  }
}
