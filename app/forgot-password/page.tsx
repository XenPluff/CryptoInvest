import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";

export const metadata = {
  title: "Reset your password",
  description: "Request a secure password reset link.",
  robots: { index: false, follow: false },
};
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="A fresh start."
      description="Enter the email address linked to your account. We’ll send you a secure password reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
