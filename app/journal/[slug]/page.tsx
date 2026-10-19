import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { JournalArticle } from "@/components/public/Journal";
export const metadata: Metadata = { title: "Publication" };
export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PublicShell>
      <JournalArticle slug={slug} />
    </PublicShell>
  );
}
