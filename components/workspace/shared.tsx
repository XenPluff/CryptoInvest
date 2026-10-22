"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale, displayLocale } from "@/lib/i18n";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, money } from "@/lib/api";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  LoaderCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";

export type RecordData = Record<string, any>;
export function useRemote<T = RecordData>(path: string, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      setData(await api<T>(path));
      setStatus(200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus(
        typeof e === "object" && e !== null && "status" in e
          ? Number(e.status)
          : 500,
      );
    } finally {
      setLoading(false);
    }
  }, [path, enabled]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, loading, error, status, reload };
}
export function LoadState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  useDisplayLocale();
  if (loading)
    return <TranslatedContent>{(
      <div className="ws-state" role="status">
        <LoaderCircle className="ws-spin" size={22} /> Loading your workspace…
      </div>
    )}</TranslatedContent>;
  if (error)
    return <TranslatedContent>{(
      <div className="ws-state ws-state-error" role="alert">
        <CircleAlert size={22} />
        <span>{error}</span>
        <button className="ws-button ws-button-small" onClick={reload}>
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    )}</TranslatedContent>;
  return null;
}
export function Empty({
  title,
  children,
  icon: Icon = Wallet,
}: {
  title: string;
  children: React.ReactNode;
  icon?: any;
}) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <div className="ws-empty">
      <div className="ws-empty-icon">
        <Icon size={25} strokeWidth={1.3} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )}</TranslatedContent>;
}
export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <section className={`ws-panel ${className}`}>
      {(title || eyebrow || action) && (
        <div className="ws-panel-header">
          <div>
            {eyebrow && <span className="ws-eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )}</TranslatedContent>;
}
export function Badge({ value }: { value: string }) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <span className={`ws-badge ws-badge-${String(value).toLowerCase()}`}>
      {String(value || "pending").replaceAll("_", " ")}
    </span>
  )}</TranslatedContent>;
}
export function DateText({ value }: { value: any }) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <>
      {value
        ? new Date(value).toLocaleDateString(displayLocale(), {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—"}
    </>
  )}</TranslatedContent>;
}
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  useDisplayLocale();
  const [copied, setCopied] = useState(false);
  return <TranslatedContent>{(
    <button
      className="ws-button ws-button-small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
      {copied ? "Copied" : label}
    </button>
  )}</TranslatedContent>;
}
export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "success" | "error";
}) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`ws-notice ws-notice-${tone}`}
    >
      <CircleAlert size={16} />
      <div>{children}</div>
    </div>
  )}</TranslatedContent>;
}
export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  defaultValue,
  min,
  max,
  step,
  minLength,
  maxLength,
  inputMode,
  pattern,
  autoComplete,
  children,
  help,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  minLength?: number;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  autoComplete?: string;
  children?: React.ReactNode;
  help?: string;
}) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <label className="ws-field">
      <span>{label}</span>
      {children || (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          autoComplete={autoComplete}
        />
      )}
      {help && <small>{help}</small>}
    </label>
  )}</TranslatedContent>;
}
export function ActionForm({
  path,
  method = "POST",
  children,
  submit = "Save changes",
  transform,
  onSuccess,
  disabled = false,
}: {
  path: string;
  method?: string;
  children: React.ReactNode;
  submit?: string;
  transform?: (d: RecordData) => RecordData;
  onSuccess?: (d: RecordData) => void;
  disabled?: boolean;
}) {
  useDisplayLocale();
  const administratorAction = path.startsWith("/admin/") && !["GET", "HEAD"].includes(method);
  const formRef = useRef<HTMLFormElement>(null);
  const [needsCode, setNeedsCode] = useState(false);
  useLayoutEffect(() => {
    // Inspect rendered fields so code inputs inside reusable child components
    // are respected, without duplicating their required proof field.
    const existing = Array.from(formRef.current?.querySelectorAll('input[name="code"]') ?? [])
      .some(input => !input.closest("[data-administrator-proof]"));
    setNeedsCode(administratorAction && !existing);
  }, [administratorAction, children]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; message?: string }>(
    {},
  );
  return <TranslatedContent>{(
    <form
      ref={formRef}
      className="ws-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setResult({});
        const raw: RecordData = Object.fromEntries(
          new FormData(form).entries(),
        );
        try {
          const payload = transform ? transform(raw) : raw;
          if (administratorAction) payload.code = raw.code;
          const d = await api(path, {
            method,
            body: JSON.stringify(payload),
          });
          setResult({ message: d.message || "Your changes have been saved." });
          onSuccess?.(d);
        } catch (err) {
          setResult({
            error:
              err instanceof Error
                ? err.message
                : "The request could not be completed.",
          });
        } finally {
          if (administratorAction) {
            const code = form.querySelector<HTMLInputElement>('input[name="code"]');
            if (code) code.value = "";
          }
          setBusy(false);
        }
      }}
    >
      {children}
      {needsCode && <div data-administrator-proof><Field
        label="Operator authenticator code"
        name="code"
        required
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="one-time-code"
        placeholder="6-digit code"
      /></div>}
      {result.error && <Notice tone="error">{result.error}</Notice>}
      {result.message && <Notice tone="success">{result.message}</Notice>}
      <button
        className="ws-button ws-button-gold"
        type="submit"
        disabled={busy || disabled}
      >
        {busy ? <LoaderCircle className="ws-spin" size={16} /> : null}
        {busy ? "Processing…" : submit}
        {!busy && <ArrowUpRight size={16} />}
      </button>
    </form>
  )}</TranslatedContent>;
}
export function TransactionsTable({ rows }: { rows: RecordData[] }) {
  useDisplayLocale();
  if (!rows.length)
    return <TranslatedContent>{(
      <Empty title="Your next chapter starts here">
        Deposits, investments, and withdrawals will appear in your transaction
        history.
      </Empty>
    )}</TranslatedContent>;
  return <TranslatedContent>{(
    <div className="ws-table-wrap">
      <table className="ws-table">
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Date</th>
            <th>Asset</th>
            <th>Status</th>
            <th className="ws-align-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="ws-table-title">
                  {String(t.type).replaceAll("_", " ")}
                </div>
                <small className="ws-mono">{t.id?.slice(0, 14)}</small>
              </td>
              <td>
                <DateText value={t.createdAt} />
              </td>
              <td>
                {t.asset || "USD"}
                <small>{t.network || "Account balance"}</small>
              </td>
              <td>
                <Badge value={t.status} />
              </td>
              <td className="ws-align-right ws-tabular">
                {t.direction === "DEBIT"
                  ? "−"
                  : t.direction === "CREDIT"
                    ? "+"
                    : ""}
                {money(Number(t.amount || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}</TranslatedContent>;
}

export function useModalFocus(onClose?: () => void) {
  useEffect(() => {
    if (!onClose) return;
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ),
      ).filter((el) => el.offsetParent !== null);
    focusable()[0]?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [onClose]);
}
