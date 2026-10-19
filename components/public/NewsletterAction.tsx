"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
export function NewsletterAction({
  action,
}: {
  action: "confirm" | "unsubscribe";
}) {
  const params = useSearchParams();
  const token = params.get("token");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const valid = token && /^[A-Za-z0-9_-]{43}$/.test(token);
  return (
    <section
      className="container public-body-section public-divider"
      style={{ maxWidth: 760, minHeight: 300 }}
    >
      {message ? (
        <div role="status">
          <CheckCircle2
            size={30}
            style={{ color: "var(--gold)", marginBottom: 24 }}
          />
          <h2 style={{ fontSize: 36 }}>
            {action === "confirm"
              ? "You’re on the list."
              : "Your preference is saved."}
          </h2>
          <p style={{ margin: "20px 0" }}>{message}</p>
          <Link className="button button-outline" href="/">
            Return to AUREON <ArrowUpRight size={16} />
          </Link>
        </div>
      ) : !valid ? (
        <div role="alert">
          <h2 style={{ fontSize: 36 }}>This link is incomplete.</h2>
          <p>
            Please open the full link from your email. You can also contact{" "}
            <Link href="/support">support</Link> for help.
          </p>
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const result = await api(`/newsletter/${action}`, {
                method: "POST",
                body: JSON.stringify({ token }),
              });
              setMessage(result.message);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p style={{ lineHeight: 1.8, marginBottom: 28 }}>
            {action === "confirm"
              ? "Confirm that you want to receive occasional AUREON insights and announcements. You can unsubscribe at any time using the link in each newsletter."
              : "Confirm that you want to stop receiving the AUREON newsletter. Account security and transaction messages are managed separately."}
          </p>
          {error && (
            <div className="public-notice" role="alert">
              <p>{error}</p>
            </div>
          )}
          <button className="button button-gold" type="submit" disabled={busy}>
            {busy && <LoaderCircle size={17} />}{" "}
            {busy
              ? "Saving…"
              : action === "confirm"
                ? "Confirm my subscription"
                : "Unsubscribe from the newsletter"}{" "}
            <ArrowUpRight size={16} />
          </button>
        </form>
      )}
    </section>
  );
}
