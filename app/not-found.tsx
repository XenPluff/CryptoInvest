"use client";
import Link from "next/link";
import { PublicShell, PageIntro } from "@/components/public/PublicShell";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";

export default function NotFound() {
  useDisplayLocale();
  return <TranslatedContent><PublicShell>
    <PageIntro eyebrow="404" title="Page not found" description="Check the address or return to the homepage." />
    <div className="container public-body-section">
      <Link href="/" className="button button-gold">Back to home</Link>{" "}
      <Link href="/support" className="button button-outline">Contact support</Link>
    </div>
  </PublicShell></TranslatedContent>;
}
