"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";

export function PasskeyLogin() {
  useDisplayLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setSupported(browserSupportsWebAuthn() && window.isSecureContext);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { options, challengeId } = await api<{
        options: PublicKeyCredentialRequestOptionsJSON;
        challengeId: string;
      }>("/auth/passkeys/login/options", {
        method: "POST",
        body: JSON.stringify({ email: String(form.get("email")).trim() }),
      });
      const response = await startAuthentication({ optionsJSON: options });
      const result = await api<{ user: { role: string } }>(
        "/auth/passkeys/login/verify",
        {
          method: "POST",
          body: JSON.stringify({
            challengeId,
            response,
            code: String(form.get("code") || "").trim(),
          }),
        },
      );
      const next = params.get("next");
      router.replace(
        next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
          ? next
          : result.user.role === "ADMIN"
            ? "/admin"
            : "/dashboard",
      );
      router.refresh();
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : "";
      setError(
        name === "NotAllowedError" || name === "AbortError"
          ? "Passkey sign in was canceled or timed out. You can try again."
          : cause instanceof Error
            ? cause.message
            : "Passkey sign in could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return <TranslatedContent>{(
    <details className="auth-referral auth-passkey">
      <summary>
        <Fingerprint size={17} /> Sign in with a passkey
      </summary>
      <form className="auth-form" onSubmit={submit}>
        <p className="auth-small">
          Use a passkey you previously added in account security. Your device
          may ask for your fingerprint, face, or PIN.
        </p>
        <label className="auth-field">
          <span>Email address</span>
          <input
            name="email"
            type="email"
            autoComplete="username webauthn"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
        </label>
        <label className="auth-field">
          <span>
            Authenticator code{" "}
            <span className="auth-optional">(if enabled)</span>
          </span>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="6-digit code"
          />
        </label>
        {error && (
          <div role="alert" className="auth-feedback auth-feedback-error">
            {error}
          </div>
        )}
        {!supported && (
          <p className="auth-small">
            Passkeys require a supported browser on HTTPS or localhost.
          </p>
        )}
        <button
          className="button button-outline auth-submit"
          type="submit"
          disabled={!supported || busy}
        >
          {busy ? (
            <LoaderCircle size={18} className="auth-spinner" />
          ) : (
            <Fingerprint size={18} />
          )}
          {busy ? "Verifying your passkey…" : "Continue with passkey"}
        </button>
      </form>
    </details>
  )}</TranslatedContent>;
}
