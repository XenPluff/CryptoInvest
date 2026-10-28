"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { ArrowUpRight } from "lucide-react";
import { AureonMark } from "./SiteHeader";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_URL } from "@/lib/contact";
import FooterLogoGrid from "./FooterLogoGrid";
import footerLogos from "@/lib/footer-logos.json";
import educationResources from "@/lib/education-resources.json";
export default function SiteFooter() {
  useDisplayLocale();
  const { t } = useTranslation();
  return <TranslatedContent>{(
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-identity-with-logos">
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
            <FooterLogoGrid logos={footerLogos} label={t("Company information")} />
            <figure className="footer-education">
              <figcaption>{t("External investor education")}</figcaption>
              <ul className="footer-education-logos">
                {educationResources.map(resource => <li key={resource.id} className="footer-education-logo" data-resource={resource.id}>
                  <span className="footer-education-art">
                    {resource.image ? <img src={resource.image} alt={resource.name} width={resource.width} height={resource.height} loading="lazy" draggable={false} translate="no" data-presentation={resource.presentation || undefined} /> : <span className="footer-education-text" translate="no">{resource.name}</span>}
                  </span>
                  <span className="footer-education-name" translate="no" aria-hidden={resource.image ? true : undefined}>{resource.label}</span>
                </li>)}
              </ul>
              <p>{t("Educational resources only; no affiliation or endorsement of AUREON is implied.")}</p>
            </figure>
          </div>
          <div className="footer-links">
            <div>
              <span>{t("EXPLORE")}</span>
              <Link href="/plans">{t("Investment plans")}</Link>
              <Link href="/insights">{t("Market insights")}</Link>
              <Link href="/journal">{t("Journal")}</Link>
              <Link href="/about">{t("About Aureon")}</Link>
              <Link href="/company-profile">{t("Company profile")}</Link>
              <Link href="/approach">{t("How value is generated")}</Link>
              <Link href="/videos">{t("Video guides")}</Link>
              <Link href="/cards">{t("Aureon card concepts")}</Link>
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
  )}</TranslatedContent>;
}
