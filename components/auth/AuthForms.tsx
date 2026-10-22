"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { PasskeyLogin } from "./PasskeyLogin";

function PasswordField({
  label = "Password",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  useDisplayLocale();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return <TranslatedContent>{(
    <label className="auth-field">
      <span>{t(label)}</span>
      <div className="auth-input-wrap">
        <input {...props} type={visible ? "text" : "password"} required />
        <button
          className="auth-password-toggle"
          type="button"
          aria-label={`${t(visible ? "Hide password" : "Show password")} — ${t(label)}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  )}</TranslatedContent>;
}

function Feedback({ error, message }: { error?: string; message?: string }) {
  useDisplayLocale();
  const { t } = useTranslation();
  if (error)
    return <TranslatedContent>{(
      <div className="auth-feedback auth-feedback-error" role="alert">
        <CircleAlert size={17} />
        <span>{t(error)}</span>
      </div>
    )}</TranslatedContent>;
  if (message)
    return <TranslatedContent>{(
      <div className="auth-feedback auth-feedback-success" role="status">
        <CheckCircle2 size={17} />
        <span>{message}</span>
      </div>
    )}</TranslatedContent>;
  return null;
}

function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  useDisplayLocale();
  const { t } = useTranslation();
  return <TranslatedContent>{(
    <button
      className="button button-gold auth-submit"
      type="submit"
      disabled={busy}
    >
      {busy ? (
        <>
          <LoaderCircle className="auth-spinner" size={18} /> {t("Please wait")}
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={17} />
        </>
      )}
    </button>
  )}</TranslatedContent>;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function LoginForm() {
  useDisplayLocale();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const submitted = twoFactor
      ? credentials
      : {
          email: String(form.get("email")).trim(),
          password: String(form.get("password")),
        };
    try {
      const result = await api<{
        requiresTwoFactor?: boolean;
        requiresTwoFactorSetup?: boolean;
        user?: { role: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          ...submitted,
          ...(twoFactor ? { code: String(form.get("code")).trim() } : {}),
        }),
      });
      if (result.requiresTwoFactor) {
        setCredentials(submitted);
        setTwoFactor(true);
      } else if (result.requiresTwoFactorSetup) {
        router.replace("/dashboard/account");
        router.refresh();
      } else if (result.user) {
        const next = params.get("next");
        router.replace(
          next?.startsWith("/") &&
            !next.startsWith("//") &&
            !next.includes("\\")
            ? next
            : result.user.role.toLowerCase() === "admin"
              ? "/admin"
              : "/dashboard",
        );
        router.refresh();
      } else {
        setError("Sign in could not be completed. Please try again.");
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return <TranslatedContent>{(
    <>
      <form className="auth-form" onSubmit={submit}>
        {twoFactor ? (
          <>
            <div className="auth-factor-intro">
              <ShieldCheck size={22} />
              <p>
                {t(
                  "Enter the 6-digit code from your authenticator app to finish signing in.",
                )}
              </p>
            </div>
            <label className="auth-field">
              <span>{t("Authentication code")}</span>
              <input
                name="code"
                className="auth-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                placeholder="000000"
                required
              />
            </label>
          </>
        ) : (
          <>
            <label className="auth-field">
              <span>{t("Email address")}</span>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            <PasswordField
              name="password"
              placeholder={t("Enter your password")}
              autoComplete="current-password"
            />
            <div className="auth-form-options">
              <span className="auth-session-note">
                <ShieldCheck size={13} /> {t("Secure sign in")}
              </span>
              <Link href="/forgot-password">{t("Forgot password?")}</Link>
            </div>
          </>
        )}
        <Feedback error={error} />
        <SubmitButton busy={busy}>
          {t(twoFactor ? "Verify & sign in" : "Sign in to your account")}
        </SubmitButton>
        {twoFactor && (
          <button
            className="auth-text-button"
            type="button"
            onClick={() => {
              setTwoFactor(false);
              setCredentials({ email: "", password: "" });
              setError("");
            }}
          >
            {t("Use a different account")}
          </button>
        )}
        <div className="auth-divider">
          <span>{t("YOUR NEXT CHAPTER STARTS HERE")}</span>
        </div>
        <p className="auth-switch">
          {t("New to Aureon?")}{" "}
          <Link href="/register">
            {t("Create an account")} <ArrowRight size={13} />
          </Link>
        </p>
      </form>
      {!twoFactor && <PasskeyLogin />}
    </>
  )}</TranslatedContent>;
}

export function RegisterForm() {
  useDisplayLocale();
  const { t } = useTranslation();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    if (String(form.get("password")) !== String(form.get("confirmPassword"))) {
      setError("Your passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const referralCode = String(form.get("referralCode") || "").trim();
      const result = await api<{ message: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")).trim(),
          email: String(form.get("email")).trim(),
          password: String(form.get("password")),
          ...(referralCode ? { referralCode } : {}),
        }),
      });
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  if (message)
    return <TranslatedContent>{(
      <div className="auth-result">
        <div className="auth-result-icon">
          <Mail size={28} />
        </div>
        <h2>{t("Check your inbox.")}</h2>
        <p>{message}</p>
        <p className="auth-small">
          {t(
            "Open your verification link to confirm your email address. If you cannot find the email, check your spam folder.",
          )}
        </p>
        <Link href="/login" className="button button-gold auth-submit">
          {t("Continue to sign in")} <ArrowRight size={16} />
        </Link>
        <p className="auth-switch">
          <Link href="/verify-email">{t("Need a new verification link?")}</Link>
        </p>
      </div>
    )}</TranslatedContent>;
  return <TranslatedContent>{(
    <form className="auth-form auth-register-form" onSubmit={submit}>
      <label className="auth-field">
        <span>{t("Full name")}</span>
        <input
          name="name"
          placeholder={t("Your full name")}
          autoComplete="name"
          minLength={2}
          maxLength={100}
          required
        />
      </label>
      <label className="auth-field">
        <span>{t("Email address")}</span>
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <PasswordField
        name="password"
        placeholder={t("Create a strong password")}
        autoComplete="new-password"
        minLength={12}
        maxLength={72}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <div
        className={`auth-password-hint ${password.length >= 12 ? "auth-hint-complete" : ""}`}
      >
        <Check size={12} /> {t("At least 12 characters")}
      </div>
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        placeholder={t("Re-enter your password")}
        autoComplete="new-password"
        minLength={12}
        maxLength={72}
      />
      <details
        className="auth-referral"
        open={Boolean(params.get("ref") || params.get("referral"))}
      >
        <summary>{t("Have a referral code?")}</summary>
        <label className="auth-field">
          <span>
            {t("Referral code")}{" "}
            <span className="auth-optional">{t("(optional)")}</span>
          </span>
          <input
            name="referralCode"
            placeholder={t("Enter referral code")}
            defaultValue={params.get("ref") || params.get("referral") || ""}
            maxLength={64}
            autoComplete="off"
          />
        </label>
      </details>
      <label className="auth-consent">
        <input name="terms" type="checkbox" required />
        <span>
          {t("I agree to the")}{" "}
          <Link href="/legal/terms">{t("Terms of Service")}</Link> {t("and")}{" "}
          <Link href="/legal/privacy">{t("Privacy Policy")}</Link>
          {t(". I understand that investing involves risk.")}
        </span>
      </label>
      <Feedback error={error} />
      <SubmitButton busy={busy}>{t("Create your account")}</SubmitButton>
      <p className="auth-switch">
        {t("Already have an account?")}{" "}
        <Link href="/login">
          {t("Sign in")} <ArrowRight size={13} />
        </Link>
      </p>
    </form>
  )}</TranslatedContent>;
}

export function ForgotPasswordForm() {
  useDisplayLocale();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: String(form.get("email")).trim() }),
      });
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return <TranslatedContent>{message ? (
    <div className="auth-result">
      <div className="auth-result-icon">
        <Mail size={28} />
      </div>
      <h2>{t("Check your inbox.")}</h2>
      <p>{message}</p>
      <p className="auth-small">
        {t(
          "For your security, reset links expire. Check your spam folder if the message has not arrived.",
        )}
      </p>
      <Link href="/login" className="button button-outline auth-submit">
        {t("Back to sign in")} <ArrowRight size={16} />
      </Link>
    </div>
  ) : (
    <form className="auth-form" onSubmit={submit}>
      <label className="auth-field">
        <span>{t("Email address")}</span>
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <Feedback error={error} />
      <SubmitButton busy={busy}>{t("Send reset link")}</SubmitButton>
      <p className="auth-switch">
        {t("Remember your password?")}{" "}
        <Link href="/login">
          {t("Sign in")} <ArrowRight size={13} />
        </Link>
      </p>
    </form>
  )}</TranslatedContent>;
}

export function ResetPasswordForm() {
  useDisplayLocale();
  const { t } = useTranslation();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: String(form.get("password")) }),
      });
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return <TranslatedContent>{(
      <div className="auth-result">
        <div className="auth-result-icon">
          <KeyRound size={28} />
        </div>
        <h2>{t("A fresh link is needed.")}</h2>
        <p>
          {t(
            "Open the password reset link from your email, or request a new one below.",
          )}
        </p>
        <Link
          href="/forgot-password"
          className="button button-gold auth-submit"
        >
          {t("Request reset link")} <ArrowRight size={16} />
        </Link>
      </div>
    )}</TranslatedContent>;
  if (message)
    return <TranslatedContent>{(
      <div className="auth-result">
        <div className="auth-result-icon">
          <CheckCircle2 size={28} />
        </div>
        <h2>{t("Password updated.")}</h2>
        <p>{message}</p>
        <Link href="/login" className="button button-gold auth-submit">
          {t("Sign in securely")} <ArrowRight size={16} />
        </Link>
      </div>
    )}</TranslatedContent>;
  return <TranslatedContent>{(
    <form className="auth-form" onSubmit={submit}>
      <PasswordField
        name="password"
        label="New password"
        placeholder={t("Create a strong password")}
        autoComplete="new-password"
        minLength={12}
        maxLength={72}
      />
      <p className="auth-password-hint">
        <Check size={12} /> {t("At least 12 characters")}
      </p>
      <PasswordField
        name="confirmPassword"
        label="Confirm new password"
        placeholder={t("Re-enter your new password")}
        autoComplete="new-password"
        minLength={12}
        maxLength={72}
      />
      <Feedback error={error} />
      <SubmitButton busy={busy}>{t("Update password")}</SubmitButton>
      <p className="auth-switch">
        <Link href="/forgot-password">{t("Request a new reset link")}</Link>
      </p>
    </form>
  )}</TranslatedContent>;
}

export function VerifyEmailForm() {
  useDisplayLocale();
  const { t } = useTranslation();
  const params = useSearchParams();
  const token = params.get("token");
  const started = useRef(false);
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  async function verify() {
    if (!token) return;
    setStatus("pending");
    try {
      const result = await api<{ message: string }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setMessage(result.message);
      setStatus("success");
    } catch (cause) {
      setMessage(errorMessage(cause));
      setStatus("error");
    }
  }
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      void verify();
    }
  }, [token]); // Each link is submitted once, including React strict mode.
  if (!token)
    return <TranslatedContent>{(
      <div className="auth-result">
        <div className="auth-result-icon">
          <Mail size={28} />
        </div>
        <h2>{t("Look for our email.")}</h2>
        <p>
          {t(
            "Open the verification link we sent when you registered to confirm your email address.",
          )}
        </p>
        <p className="auth-small">
          {t(
            "If you cannot find it, check your spam folder or request a new link.",
          )}
        </p>
        <ResendVerificationForm />
        <p className="auth-switch">
          <Link href="/login">
            {t("Back to sign in")} <ArrowRight size={13} />
          </Link>
        </p>
      </div>
    )}</TranslatedContent>;
  return <TranslatedContent>{(
    <div className="auth-result">
      <div className="auth-result-icon">
        {status === "pending" || status === "idle" ? (
          <LoaderCircle className="auth-spinner" size={28} />
        ) : status === "success" ? (
          <CheckCircle2 size={28} />
        ) : (
          <CircleAlert size={28} />
        )}
      </div>
      <h2>
        {t(
          status === "success"
            ? "Email confirmed."
            : status === "error"
              ? "Unable to verify."
              : "Confirming your email…",
        )}
      </h2>
      {message && (
        <p role={status === "error" ? "alert" : "status"}>{message}</p>
      )}
      {status === "pending" && <p>{t("This should only take a moment.")}</p>}
      {status === "success" && (
        <Link href="/login" className="button button-gold auth-submit">
          {t("Continue to sign in")} <ArrowRight size={16} />
        </Link>
      )}
      {status === "error" && (
        <>
          <ResendVerificationForm />
          <p className="auth-switch">
            <Link href="/support">{t("Contact support")}</Link>
          </p>
        </>
      )}
    </div>
  )}</TranslatedContent>;
}

function ResendVerificationForm() {
  useDisplayLocale();
  const { t } = useTranslation();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ message: string }>(
        "/auth/resend-verification",
        {
          method: "POST",
          body: JSON.stringify({ email: String(form.get("email")).trim() }),
        },
      );
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return <TranslatedContent>{(
    <form className="auth-form auth-resend-form" onSubmit={submit}>
      <label className="auth-field">
        <span>{t("Email address")}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={params.get("email") || ""}
          maxLength={254}
          required
        />
      </label>
      <Feedback error={error} message={message} />
      <SubmitButton busy={busy}>{t("Send verification link")}</SubmitButton>
    </form>
  )}</TranslatedContent>;
}

export function AuthFormLoading() {
  useDisplayLocale();
  const { t } = useTranslation();
  return <TranslatedContent>{(
    <div className="auth-form-loading" role="status">
      <LoaderCircle size={22} className="auth-spinner" />
      <span>{t("Preparing your secure session…")}</span>
    </div>
  )}</TranslatedContent>;
}
