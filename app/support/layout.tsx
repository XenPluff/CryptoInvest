import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with your Aureon account, identity verification, transactions and privacy requests.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
