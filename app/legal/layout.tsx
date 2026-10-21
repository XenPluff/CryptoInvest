import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Legal & disclosures",
  description:
    "Review Aureon terms, privacy notice, investment risk and identity verification policies.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
