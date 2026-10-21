"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, ListChecks, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import styles from "./investor-perspective.module.css";

const principles = [
  {
    icon: BookOpen,
    title: "Understand before allocating.",
    text: "Explore plan terms, business activities and risks before committing funds. Our guides bring the process into view, from account setup to withdrawal requests.",
    href: "/how-it-works",
    link: "Explore the investor journey",
  },
  {
    icon: ListChecks,
    title: "Follow each step.",
    text: "Review deposit instructions and transaction statuses in your workspace. Available funds, committed capital and illustrative targets are shown separately, so an estimate is never mistaken for money you can withdraw.",
    href: "/videos",
    link: "Watch the workspace guides",
  },
  {
    icon: ShieldCheck,
    title: "Stay in control.",
    text: "Enable authenticator protection, review account activity and contact support when you need clarification. Sensitive financial actions require additional authentication, and funding requests follow an operator review process.",
    href: "/security",
    link: "Understand account protection",
  },
] as const;

export default function InvestorPerspective() {
  const { t } = useTranslation();

  return (
    <section id="investor-perspective" className={styles.section} aria-labelledby="investor-perspective-title">
      <div className="container">
        <div className={styles.heading}>
          <div>
            <p className="eyebrow">{t("THE AUREON PERSPECTIVE")}</p>
            <h2 id="investor-perspective-title">{t("Modern investing.")}<br /><em>{t("More perspective.")}</em></h2>
          </div>
          <p className={styles.intro}>{t("We believe modern investing should make room for informed decisions. Our approach brings investment information, account records and practical guidance into one connected experience.")}</p>
        </div>
        <div className={styles.principles}>
          {principles.map(({ icon: Icon, title, text, href, link }, index) => (
            <article className={styles.principle} key={href}>
              <div className={styles.marker}><Icon size={23} strokeWidth={1.3} aria-hidden="true" /><span>0{index + 1}</span></div>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
              <Link href={href}>{t(link)} <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
        <div className={styles.closing}>
          <p>{t("A considered investment starts with a clear view of the opportunity, the process and the risk.")}</p>
          <Link href="/company-profile">{t("Read our company profile")} <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
