import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Investment plans",
  description:
    "Explore Aureon investment plan parameters, time horizons, eligibility and investment risk.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
