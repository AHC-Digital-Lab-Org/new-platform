import { useLocation } from 'react-router';
import EmailRequestForm from '../components/EmailRequestForm.jsx';
import { resendVerification } from '../api.js';

export default function ResendVerificationPage() {
  const location = useLocation();

  return (
    <EmailRequestForm
      title="Reenviar verificación de email"
      intro="Escribe el email con el que te registraste y, si todavía no está verificado, te enviaremos un enlace nuevo."
      submitLabel="Reenviar enlace"
      loadingLabel="Enviando…"
      action={resendVerification}
      initialEmail={location.state?.email ?? ''}
    />
  );
}
