import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthFormLoading, VerifyEmailForm } from "@/components/auth/AuthForms";

export const metadata = {
  title: "Verify your email",
  description: "Verify your email address to secure your Aureon account.",
  robots: { index: false, follow: false },
};
export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="ONE MORE STEP"
      title="A good beginning."
      description="Confirm your email address to complete your account registration."
    >
      <Suspense fallback={<AuthFormLoading />}>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
