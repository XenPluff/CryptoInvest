"use client";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { ArrowUpRight } from "lucide-react";
import { AureonMark } from "./SiteHeader";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_URL } from "@/lib/contact";
export default function SiteFooter() {
  const { t, locale } = useTranslation();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Link href="/" className="brand">
              <AureonMark />
              <span>
                AUREON<small>{t("DIGITAL WEALTH, REIMAGINED")}</small>
              </span>
            </Link>
            <p>
              {t("A considered approach.")}
              <br />
              {t("An extraordinary perspective.")}
            </p>
          </div>
          <div className="footer-links">
            <div>
              <span>{t("EXPLORE")}</span>
              <Link href="/plans">{t("Investment plans")}</Link>
              <Link href="/insights">{t("Market insights")}</Link>
              <Link href="/journal">{t("Journal")}</Link>
              <Link href="/about">{t("About Aureon")}</Link>
              <Link href="/videos">{t("Video guides")}</Link>
            </div>
            <div>
              <span>{t("YOUR CONFIDENCE")}</span>
              <Link href="/security">{t("Security & custody")}</Link>
              <Link href="/support">{t("Support & FAQs")}</Link>
              <Link href="/legal/risk">{t("Risk disclosure")}</Link>
            </div>
            <div>
              <span>{t("TAKE THE NEXT STEP")}</span>
              <Link href="/register">
                {t("Create an account")} <ArrowUpRight size={13} />
              </Link>
              <Link href="/login">{t("Investor access")}</Link>
              <a href="/support#contact">{t("Speak with us")}</a>
              <a href={SUPPORT_EMAIL_URL}>{SUPPORT_EMAIL}</a>
            </div>
          </div>
        </div>
        <div className="risk-notice">
          <span>{t("INVEST WITH PERSPECTIVE.")}</span>
          <p>
            {t(
              "Digital assets involve substantial risk, including the possible loss of your entire investment. Target returns are illustrative and are not guaranteed. Past performance does not indicate future results. Review all terms and risks before investing.",
            )}
          </p>
        </div>
        {locale === "fr" && (
          <p className="legal-language-note">
            Les documents juridiques sont disponibles en anglais.
          </p>
        )}
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {t("Aureon. All rights reserved.")}
          </span>
          <div>
            <Link href="/legal/privacy">{t("Privacy")}</Link>
            <Link href="/legal/terms">{t("Terms of service")}</Link>
            <Link href="/legal/aml">{t("AML policy")}</Link>
            <span className="footer-edition">
              {t("A DIFFERENT PERSPECTIVE ON WEALTH ↗")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
