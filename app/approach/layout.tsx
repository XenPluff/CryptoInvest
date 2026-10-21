import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "How value is generated",
  description: "Explore AUREON's company-reported business activities, including AI and robotics investments, with revenue mechanics, key risks and transparency standards.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
