import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Company profile & investor guide",
  description: "Download AUREON’s illustrated company profile: business activities, investment plans, investor processes, security, card designs and development priorities.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
