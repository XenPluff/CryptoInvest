import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About Aureon",
  description:
    "A considered approach to digital asset investing, built around clarity, deliberate design and transparent risk.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
