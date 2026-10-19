import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthFormLoading,
  ResetPasswordForm,
} from "@/components/auth/AuthForms";

export const metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Aureon account.",
  robots: { index: false, follow: false },
};
export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="Make it yours again."
      description="Choose a strong, unique password to keep your account protected."
    >
      <Suspense fallback={<AuthFormLoading />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
