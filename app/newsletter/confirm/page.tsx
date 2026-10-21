"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { Suspense } from "react";
import { PublicShell, PageIntro } from "@/components/public/PublicShell";
import { NewsletterAction } from "@/components/public/NewsletterAction";
export default function NewsletterConfirmPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="Newsletter preferences"
        title="A considered"
        emphasis="connection."
        description="One confirmation completes your newsletter subscription."
      />
      <Suspense
        fallback={
          <p className="container" role="status">
            Loading your subscription preference…
          </p>
        }
      >
        <NewsletterAction action="confirm" />
      </Suspense>
    </PublicShell>
  )}</TranslatedContent>;
}
