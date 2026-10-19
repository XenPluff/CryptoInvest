import type { Metadata } from "next";
import { PublicShell, PageIntro } from "@/components/public/PublicShell";
import { Journal } from "@/components/public/Journal";
export const metadata: Metadata = {
  title: "Journal",
  description:
    "Published AUREON insights, platform announcements, and answers.",
};
export default function JournalPage() {
  return (
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
  );
}
