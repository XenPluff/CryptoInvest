"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { PublicShell, PageIntro } from "@/components/public/PublicShell";
import { Journal } from "@/components/public/Journal";
export default function JournalPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="Journal"
        title="A perspective,"
        emphasis="worth considering."
        description="Insights, platform announcements, and answers published by the AUREON team."
        number="09"
      />
      <Journal />
    </PublicShell>
  )}</TranslatedContent>;
}
