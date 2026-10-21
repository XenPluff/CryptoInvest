import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Published AUREON insights, platform announcements, and answers.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
