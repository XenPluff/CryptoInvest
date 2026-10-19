import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthFormLoading, LoginForm } from "@/components/auth/AuthForms";

export const metadata = {
  title: "Sign in",
  description: "Securely sign in to your Aureon account.",
  robots: { index: false, follow: false },
};
export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Your next move starts here."
      description="Sign in to manage your portfolio and explore what comes next."
    >
      <Suspense fallback={<AuthFormLoading />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
