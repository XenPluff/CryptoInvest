"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X, Sun, Moon } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { usePreferences } from "@/lib/ui-store";
export function AureonMark({ size = 28 }: { size?: number }) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M16 3 30 28H2L16 3Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M16 12 25 28H7l9-16Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="m11.5 20 4.5 8 4.5-8h-9Z" fill="currentColor" />
    </svg>
  )}</TranslatedContent>;
}
export default function SiteHeader() {
  useDisplayLocale();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const { theme, setTheme } = usePreferences();
  const links = [
    ["The Aureon approach", "/approach"],
    ["Investment plans", "/plans"],
    ["Market insights", "/insights"],
    ["Our security", "/security"],
    ["Video guides", "/videos"],
  ];
  return <TranslatedContent>{(
    <>
      <a className="skip-link" href="#main">
        {t("Skip to content")}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link
            href="/"
            className="brand"
            title={t("Aureon home")}
          >
            <AureonMark />
            <span>
              AUREON
              <small>
                {t("DIGITAL WEALTH, REIMAGINED")}
              </small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label={t("Main navigation")}>
            {links.map(([label, href]) => (
              <Link
                key={href}
                className={path === href ? "active" : ""}
                href={href}
              >
                {t(label)}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <LanguageSelector />
            <button
              className="theme-toggle"
              title={t(
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode",
              )}
              aria-label={t(
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode",
              )}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link className="login-link" href="/login">
              {t("Log in")}
            </Link>
            <Link href="/register" className="header-join">
              {t("Get started")} <ArrowUpRight size={15} />
            </Link>
            <button
              className="mobile-toggle"
              aria-label={t(open ? "Close menu" : "Open menu")}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label={t("Mobile navigation")}>
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                {t(label)}
                <ArrowUpRight size={15} />
              </Link>
            ))}
            <Link href="/register" onClick={() => setOpen(false)}>
              {t("Get started")} <ArrowUpRight size={15} />
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>
              {t("Log in")}
            </Link>
          </nav>
        )}
      </header>
    </>
  )}</TranslatedContent>;
}
