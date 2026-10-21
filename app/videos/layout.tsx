import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Video library",
  description: "Meet AUREON and follow captioned guides to account setup, deposit review and withdrawal requests.",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
