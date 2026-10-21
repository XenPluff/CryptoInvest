"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import LanguageSelector from "../LanguageSelector";
import type { ReactNode } from "react";
import "./auth.css";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useDisplayLocale();
  const { t } = useTranslation();
  return <TranslatedContent>{(
    <main className="auth-page">
      <aside className="auth-story" aria-label={t("About Aureon")}>
        <Link href="/" className="auth-brand" aria-label={t("Aureon home")}>
          <span className="auth-brand-mark" aria-hidden="true">
            A
          </span>
          AUREON<span className="auth-brand-period">.</span>
        </Link>
        <div className="auth-art" aria-hidden="true">
          <div className="auth-orbit auth-orbit-one" />
          <div className="auth-orbit auth-orbit-two" />
          <div className="auth-orbit auth-orbit-three" />
          <div className="auth-coin">
            <span>₿</span>
            <div className="auth-coin-rim" />
          </div>
          <span className="auth-art-star auth-art-star-one">✦</span>
          <span className="auth-art-star auth-art-star-two">✧</span>
        </div>
        <div className="auth-story-copy">
          <span className="auth-kicker">{t("A DIFFERENT PERSPECTIVE")}</span>
          <h2>
            {t("Your ambition.")}
            <br />
            {t("A clearer")} <em>{t("horizon.")}</em>
          </h2>
          <p>
            {t(
              "A considered approach to digital assets, with the tools to keep you in control.",
            )}
          </p>
        </div>
        <div className="auth-story-bottom">
          <span>
            <ShieldCheck size={15} /> {t("Security at every step")}
          </span>
          <Link href="/security">
            {t("Our approach")} <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <section className="auth-main">
        <div className="auth-top">
          <Link href="/" className="auth-back">
            <ArrowLeft size={15} /> {t("Back to home")}
          </Link>
          <LanguageSelector />
        </div>
        <div className="auth-form-wrap">
          <span className="auth-kicker">{t(eyebrow)}</span>
          <h1>{t(title)}</h1>
          <p className="auth-description">{t(description)}</p>
          {children}
          {footer && <div className="auth-form-footer">{footer}</div>}
        </div>
        <div className="auth-bottom">
          <span>© {new Date().getFullYear()} Aureon</span>
          <div>
            <Link href="/legal/privacy">{t("Privacy")}</Link>
            <Link href="/legal/terms">{t("Terms")}</Link>
          </div>
        </div>
      </section>
    </main>
  )}</TranslatedContent>;
}
