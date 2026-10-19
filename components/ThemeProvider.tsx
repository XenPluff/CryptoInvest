"use client";
import { useEffect } from "react";
import { usePreferences } from "@/lib/ui-store";
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = usePreferences((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return <>{children}</>;
}
