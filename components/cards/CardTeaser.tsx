"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import styles from "./teaser.module.css";

export default function CardTeaser() {
  const { t } = useTranslation();
  return (
    <section className={`container ${styles.teaser}`} aria-labelledby="card-teaser-title">
      <figure className={styles.artwork}>
        <Image
          src="/images/cards/aureon-card-concepts.png"
          width={1536}
          height={1024}
          sizes="(max-width: 800px) 100vw, 55vw"
          alt={t("AUREON-branded gold Visa and black Mastercard front and back concepts")}
        />
        <figcaption>{t("AI-generated card artwork · Design concepts, not issued")}</figcaption>
      </figure>
      <div className={styles.copy}>
        <p className="eyebrow">{t("THE AUREON CARD CONCEPT")}</p>
        <h2 id="card-teaser-title">{t("Our signature.")}<br /><em>{t("A new dimension.")}</em></h2>
        <p>{t("Gold and charcoal finishes. The AUREON mark. Explore our Visa and Mastercard design concepts in 3D, with front and back views crafted around the company’s identity.")}</p>
        <p>{t("Choose your design preference, submit a pre-launch application and follow its preliminary review in your investor workspace.")}</p>
        <div className={styles.availability}>
          <strong>{t("PRE-LAUNCH APPLICATIONS ONLY")}</strong>
          <p>{t("These cards are not issued and cannot be used for payments. No issuing-bank or network partnership is confirmed. Future availability and international use depend on an approved issuing program and country eligibility.")}</p>
        </div>
        <div className={styles.actions}>
          <Link href="/cards" className={styles.primary}>{t("Explore the card designs")} <ArrowUpRight size={16} /></Link>
          <Link href="/dashboard/cards" className={styles.secondary}>{t("Apply for pre-launch review")} <ArrowUpRight size={15} /></Link>
        </div>
      </div>
    </section>
  );
}
