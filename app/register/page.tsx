import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthFormLoading, RegisterForm } from "@/components/auth/AuthForms";

export const metadata = {
  title: "Create an account",
  description: "Create your Aureon account to explore digital asset investing.",
  robots: { index: false, follow: false },
};
export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="A NEW PERSPECTIVE"
      title="Build your next chapter."
      description="Create your account. Take the first step toward a more considered portfolio."
    >
      <Suspense fallback={<AuthFormLoading />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
