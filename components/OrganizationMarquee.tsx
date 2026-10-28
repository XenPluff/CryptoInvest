"use client";

import { useState, type CSSProperties } from "react";
import { useTranslation } from "@/lib/i18n";
import organizationReferences from "@/lib/organization-references.json";
import styles from "./organization-marquee.module.css";

function OrganizationMark({ name, image, wordmark, ink }: { name: string; image?: string; wordmark?: boolean; ink?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <>
    {image && !failed && <img src={image} alt={wordmark ? name : ""} width={wordmark ? 160 : 28} height={32} loading="lazy" draggable={false} className={`${wordmark ? styles.wordmark : styles.symbol} ${ink ? styles.ink : ""}`} onError={() => setFailed(true)} />}
    {(!wordmark || failed || !image) && <span className={styles.name}>{name}</span>}
  </>;
}

export default function OrganizationMarquee() {
  const { t } = useTranslation();
  return <section id="industry-resources" className={styles.section} aria-labelledby="organization-resources-title">
    <div className={`container ${styles.heading}`}>
      <div><p className="eyebrow" id="organization-resources-title">{t("INDUSTRY RESOURCES")}</p><p className={styles.description}>{t("External organizations and publications, in one place.")}</p></div>
    </div>
    <div className={styles.viewport}>
      <div id="organization-logo-track" className={styles.track} style={{ "--logo-duration": `${organizationReferences.length * 5}s` } as CSSProperties}>
        {[false, true].map(duplicate => <ul key={String(duplicate)} className={styles.group} aria-hidden={duplicate || undefined}>
          {organizationReferences.map(organization => <li key={organization.id} className={styles.tile}><div className={styles.mark} translate="no"><OrganizationMark {...organization} /></div></li>)}
        </ul>)}
      </div>
    </div>
  </section>;
}
