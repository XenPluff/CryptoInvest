import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Market insights",
  description:
    "Live cryptocurrency market prices and a clear introduction to market risk.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
