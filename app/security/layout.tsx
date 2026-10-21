import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Security & transparency",
  description:
    "Understand Aureon account controls, identity verification and the status of custody, assurance and regulatory information.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
