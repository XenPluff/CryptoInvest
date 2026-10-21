"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { PageIntro, PublicShell } from "@/components/public/PublicShell";
import VideoLibrary from "@/components/public/VideoLibrary";

export default function VideosPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro eyebrow="Films & field notes" title="See the process." emphasis="Find your perspective." description="An introduction, practical guides and a short brand film. Watch at your own pace, revisit a chapter or read the full transcript." number="07" />
      <VideoLibrary />
    </PublicShell>
  )}</TranslatedContent>;
}
