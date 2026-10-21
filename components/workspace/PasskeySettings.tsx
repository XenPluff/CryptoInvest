"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";

import { useEffect, useState, type FormEvent } from "react";
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { Fingerprint, LoaderCircle, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { DateText, LoadState, Notice, Panel, useRemote } from "./shared";

type Credential = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
};

export function PasskeySettings({
  twoFactorEnabled,
}: {
  twoFactorEnabled: boolean;
}) {
  useDisplayLocale();
  const list = useRemote<{ credentials: Credential[] }>("/auth/passkeys");
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState("");
  const [label, setLabel] = useState("My passkey");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    setSupported(browserSupportsWebAuthn() && window.isSecureContext);
  }, []);

  const proof = () => (twoFactorEnabled ? { code } : { password });
  const proofPresent = twoFactorEnabled
    ? /^\d{6}$/.test(code)
    : Boolean(password);
  function clearProof() {
    setPassword("");
    setCode("");
  }
  function showError(cause: unknown) {
    const name = cause instanceof Error ? cause.name : "";
    setError(
      name === "NotAllowedError" || name === "AbortError"
        ? "Passkey setup was canceled or timed out. Please try again."
        : cause instanceof Error
          ? cause.message
          : "Your passkey could not be updated.",
    );
  }
  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("enroll");
    setError("");
    setMessage("");
    try {
      const { options, challengeId } = await api<{
        options: PublicKeyCredentialCreationOptionsJSON;
        challengeId: string;
      }>("/auth/passkeys/register/options", {
        method: "POST",
        body: JSON.stringify(proof()),
      });
      const response = await startRegistration({ optionsJSON: options });
      const result = await api<{ message: string }>(
        "/auth/passkeys/register/verify",
        {
          method: "POST",
          body: JSON.stringify({ challengeId, response, label }),
        },
      );
      setMessage(result.message);
      clearProof();
      await list.reload();
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy("");
    }
  }
  async function remove(id: string) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const result = await api<{ message: string }>(
        `/auth/passkeys/${encodeURIComponent(id)}`,
        { method: "DELETE", body: JSON.stringify(proof()) },
      );
      setMessage(result.message);
      clearProof();
      await list.reload();
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy("");
    }
  }

  return <TranslatedContent>{(
    <Panel title="Passkeys & biometrics" eyebrow="YOUR DEVICE. YOUR KEY.">
      <div className="ws-security-visual">
        <Fingerprint size={45} strokeWidth={1} />
      </div>
      <p className="ws-panel-description">
        Sign in with your fingerprint, face, or device PIN. Your biometric data
        stays on your device.
        {twoFactorEnabled
          ? " Your authenticator code is still required when signing in."
          : ""}
      </p>
      <LoadState {...list} />
      {list.data?.credentials.map((credential) => (
        <div className="ws-inline-status" key={credential.id}>
          <div>
            <strong>{credential.label}</strong>
            <br />
            <small className="ws-muted">
              Added <DateText value={credential.createdAt} />
              {credential.lastUsedAt && (
                <>
                  {" "}
                  · Last used <DateText value={credential.lastUsedAt} />
                </>
              )}
            </small>
          </div>
          <button
            className="ws-button ws-button-small"
            type="button"
            aria-label={`Remove ${credential.label}`}
            disabled={Boolean(busy) || !proofPresent}
            onClick={() => void remove(credential.id)}
          >
            {busy === credential.id ? (
              <LoaderCircle size={15} className="ws-spin" />
            ) : (
              <Trash2 size={15} />
            )}{" "}
            Remove
          </button>
        </div>
      ))}
      {!list.loading && !list.error && !list.data?.credentials.length && (
        <p className="ws-muted">No passkeys added yet.</p>
      )}
      <form className="ws-form" onSubmit={enroll}>
        <label className="ws-field">
          <span>Passkey name</span>
          <input
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={80}
            required
            placeholder="For example, personal phone"
          />
        </label>
        {twoFactorEnabled ? (
          <label className="ws-field">
            <span>Current authenticator code</span>
            <input
              name="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              placeholder="6-digit code"
            />
          </label>
        ) : (
          <label className="ws-field">
            <span>Current password</span>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
              autoComplete="current-password"
              required
            />
          </label>
        )}
        <small className="ws-muted">
          Confirm your {twoFactorEnabled ? "authenticator code" : "password"}{" "}
          before adding or removing a passkey.
        </small>
        {error && <Notice tone="error">{error}</Notice>}
        {message && <Notice tone="success">{message}</Notice>}
        {!supported && (
          <p className="ws-muted">
            Passkey enrollment requires a supported browser on HTTPS or
            localhost.
          </p>
        )}
        <button
          className="ws-button ws-button-gold"
          type="submit"
          disabled={
            Boolean(busy) ||
            !supported ||
            !proofPresent ||
            (list.data?.credentials.length ?? 0) >= 10
          }
        >
          {busy === "enroll" ? (
            <LoaderCircle size={16} className="ws-spin" />
          ) : (
            <Fingerprint size={16} />
          )}
          {busy === "enroll" ? "Creating your passkey…" : "Add a passkey"}
        </button>
      </form>
    </Panel>
  )}</TranslatedContent>;
}
