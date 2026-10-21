"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { pageTitles } from "@/lib/page-titles";
import { useTranslation, useLocale } from "@/lib/i18n";

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const { locale, t } = useTranslation();
  const pathname = usePathname();
  useEffect(() => {
    void Promise.resolve(useLocale.persist.rehydrate()).then(() => {
      void useLocale.getState().setLocale(useLocale.getState().locale);
    });
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  useEffect(() => {
    const base = pathname.startsWith("/dashboard") ? "/dashboard" : pathname.startsWith("/admin") ? "/admin" : pathname.startsWith("/journal/") ? "/journal" : pathname;
    const title = t(pageTitles[base] || "Page not found");
    const desired = base === "/" ? title : `${title} | AUREON`;
    const apply = () => { if (document.title !== desired) document.title = desired; };
    // Next can stream canonical metadata after hydration; retain the chosen browser title.
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, t]);
  return children;
}
