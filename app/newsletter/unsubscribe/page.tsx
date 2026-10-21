"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { Suspense } from "react";
import { PublicShell, PageIntro } from "@/components/public/PublicShell";
import { NewsletterAction } from "@/components/public/NewsletterAction";
export default function NewsletterUnsubscribePage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="Newsletter preferences"
        title="Your inbox,"
        emphasis="your choice."
        description="Manage your consent to receive the AUREON newsletter."
      />
      <Suspense
        fallback={
          <p className="container" role="status">
            Loading your subscription preference…
          </p>
        }
      >
        <NewsletterAction action="unsubscribe" />
      </Suspense>
    </PublicShell>
  )}</TranslatedContent>;
}
