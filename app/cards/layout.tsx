import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "AUREON card concepts & applications", description: "Explore AUREON Visa and Mastercard card design concepts and submit a pre-launch application. Cards are not issued and payment functionality is unavailable." };

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
