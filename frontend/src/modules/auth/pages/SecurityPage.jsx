import ChangePasswordForm from '../components/ChangePasswordForm.jsx';
import LogoutAllSection from '../components/LogoutAllSection.jsx';

export default function SecurityPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Seguridad de la cuenta</h1>
      <ChangePasswordForm />
      <LogoutAllSection />
    </section>
  );
}
