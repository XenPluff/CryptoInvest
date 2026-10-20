import type { Metadata } from "next";
import { PageIntro, PublicShell } from "@/components/public/PublicShell";
import VideoLibrary from "@/components/public/VideoLibrary";

export const metadata: Metadata = {
  title: "Video library",
  description: "Meet AUREON and follow captioned guides to account setup, deposit review and withdrawal requests.",
};

export default function VideosPage() {
  return (
    <PublicShell>
      <PageIntro eyebrow="Films & field notes" title="See the process." emphasis="Find your perspective." description="An introduction, practical guides and a short brand film. Watch at your own pace, revisit a chapter or read the full transcript." number="07" />
      <VideoLibrary />
    </PublicShell>
  );
}
