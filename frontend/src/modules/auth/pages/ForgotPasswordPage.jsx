import EmailRequestForm from '../components/EmailRequestForm.jsx';
import { forgotPassword } from '../api.js';

export default function ForgotPasswordPage() {
  return (
    <EmailRequestForm
      title="Recuperar contraseña"
      intro="Escribe el email de tu cuenta y, si existe, te enviaremos un enlace para elegir una contraseña nueva."
      submitLabel="Enviar enlace"
      loadingLabel="Enviando…"
      action={forgotPassword}
    />
  );
}
