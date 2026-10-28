"use client";
import TranslatedContent, { Verbatim } from "@/components/TranslatedContent";
import { useDisplayLocale, displayLocale } from "@/lib/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CircleAlert, Megaphone } from "lucide-react";
import { api } from "@/lib/api";

type Entry = {
  id: string;
  kind: string;
  slug: string;
  title: string;
  summary: string;
  body?: string;
  publishedAt: string;
  updatedAt: string;
};
function usePublications(path: string) {
  const [data, setData] = useState<{ entries?: Entry[]; entry?: Entry } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void api(path)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : "Publications are temporarily unavailable.",
          );
      });
    return () => {
      active = false;
    };
  }, [path, retry]);
  return { data, error, retry: () => setRetry((value) => value + 1) };
}
function PublicationError({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <div className="public-notice" role="alert">
      <CircleAlert size={18} />
      <p>
        {error}{" "}
        <button
          type="button"
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            color: "var(--gold-light)",
            textDecoration: "underline",
          }}
          onClick={retry}
        >
          Try again
        </button>
      </p>
    </div>
  )}</TranslatedContent>;
}
export function Journal() {
  useDisplayLocale();
  const [kind, setKind] = useState("");
  const r = usePublications(`/content?limit=50${kind ? `&kind=${kind}` : ""}`);
  return <TranslatedContent>{(
    <section className="container public-body-section public-divider">
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}
        role="group"
        aria-label="Filter publications"
      >
        {[
          ["", "All publications"],
          ["ARTICLE", "Articles"],
          ["ANNOUNCEMENT", "Announcements"],
          ["FAQ", "Questions & answers"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`button ${kind === value ? "button-gold" : "button-outline"}`}
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {r.error ? (
        <PublicationError error={r.error} retry={r.retry} />
      ) : !r.data ? (
        <p role="status">Loading publications…</p>
      ) : r.data.entries?.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
            gap: 24,
          }}
        >
          {r.data.entries.map((entry) => (
            <article
              key={entry.id}
              className="public-contact-note"
              style={{
                padding: 28,
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            >
              <p className="eyebrow">
                {entry.kind === "ARTICLE"
                  ? "Journal"
                  : entry.kind === "FAQ"
                    ? "Questions & answers"
                    : "Announcement"}
              </p>
              <h2 style={{ fontSize: "var(--type-section)", margin: "20px 0" }}>
                <Link href={`/journal/${entry.slug}`}>{entry.title}</Link>
              </h2>
              <p>{entry.summary}</p>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <time dateTime={entry.publishedAt}>
                  {new Date(entry.publishedAt).toLocaleDateString(displayLocale(), {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <Link
                  href={`/journal/${entry.slug}`}
                  aria-label={`Read ${entry.title}`}
                >
                  <ArrowUpRight size={20} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "50px 20px" }}>
          <BookOpen
            size={32}
            style={{ margin: "0 auto 24px", color: "var(--gold)" }}
          />
          <h2 style={{ fontSize: "var(--type-section)" }}>A considered perspective takes time.</h2>
          <p>
            There are no published{" "}
            {kind === "ARTICLE"
              ? "articles"
              : kind === "ANNOUNCEMENT"
                ? "announcements"
                : kind === "FAQ"
                  ? "answers"
                  : "publications"}{" "}
            yet. Check back for updates from the AUREON team.
          </p>
        </div>
      )}
    </section>
  )}</TranslatedContent>;
}
export function JournalArticle({ slug }: { slug: string }) {
  useDisplayLocale();
  const r = usePublications(`/content/${encodeURIComponent(slug)}`);
  return <TranslatedContent>{(
    <section
      className="container public-body-section public-divider"
      style={{ maxWidth: 860 }}
    >
      {r.error ? (
        <PublicationError error={r.error} retry={r.retry} />
      ) : !r.data?.entry ? (
        <p role="status">Loading publication…</p>
      ) : (
        <article>
          <p className="eyebrow">{r.data.entry.kind.replace("_", " ")}</p>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--type-display)",
              lineHeight: 1.1,
              margin: "24px 0",
            }}
          >
            {r.data.entry.title}
          </h1>
          <p style={{ fontSize: "var(--type-body)", lineHeight: "var(--type-leading-body)" }}>
            {r.data.entry.summary}
          </p>
          <p style={{ margin: "20px 0 36px", color: "var(--muted)" }}>
            Published{" "}
            <time dateTime={r.data.entry.publishedAt}>
              {new Date(r.data.entry.publishedAt).toLocaleDateString(displayLocale(), {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </p>
          <div
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              lineHeight: 1.9,
              fontSize: "var(--type-ui)",
            }}
          >
            <Verbatim>{r.data.entry.body}</Verbatim>
          </div>
          <Link
            className="button button-outline"
            style={{ marginTop: 40 }}
            href="/journal"
          >
            Back to the journal
          </Link>
        </article>
      )}
    </section>
  )}</TranslatedContent>;
}
export function PublishedAnnouncements() {
  useDisplayLocale();
  const r = usePublications("/content?kind=ANNOUNCEMENT&limit=3");
  if (!r.data?.entries?.length) return null;
  return <TranslatedContent>{(
    <aside
      className="container"
      aria-label="Platform announcements"
      style={{ marginTop: 28 }}
    >
      {r.data.entries.map((entry) => (
        <div className="public-notice" key={entry.id}>
          <Megaphone size={18} />
          <p>
            <strong>{entry.title}</strong> — {entry.summary}{" "}
            <Link href={`/journal/${entry.slug}`}>Read announcement</Link>
          </p>
        </div>
      ))}
    </aside>
  )}</TranslatedContent>;
}
export function PublishedFaqs() {
  useDisplayLocale();
  const r = usePublications("/content?kind=FAQ&limit=50");
  if (!r.data?.entries?.length) return null;
  return <TranslatedContent>{(
    <div aria-label="Published answers">
      {r.data.entries.map((entry) => (
        <details key={entry.id}>
          <summary>{entry.title}</summary>
          <p>
            {entry.summary}{" "}
            <Link href={`/journal/${entry.slug}`}>Read the full answer</Link>
          </p>
        </details>
      ))}
    </div>
  )}</TranslatedContent>;
}
