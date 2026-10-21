import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "From creating your Aureon account to verification, deposit review and investment records.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
