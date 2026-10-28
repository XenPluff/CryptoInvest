"use client";

import { useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
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
  const [paused, setPaused] = useState(false);
  return <section id="industry-resources" className={styles.section} aria-labelledby="organization-resources-title">
    <div className={`container ${styles.heading}`}>
      <div><p className="eyebrow" id="organization-resources-title">{t("INDUSTRY RESOURCES")}</p><p className={styles.description}>{t("External organizations and publications, in one place.")}</p></div>
      <button type="button" className={styles.control} aria-label={t(paused ? "Resume logo scrolling" : "Pause logo scrolling")} aria-pressed={paused} aria-controls="organization-logo-track" onClick={() => setPaused(value => !value)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
    </div>
    <div className={styles.viewport}>
      <div id="organization-logo-track" className={`${styles.track} ${paused ? styles.paused : ""}`} style={{ "--logo-duration": `${organizationReferences.length * 5}s` } as CSSProperties}>
        {[false, true].map(duplicate => <ul key={String(duplicate)} className={styles.group} aria-hidden={duplicate || undefined}>
          {organizationReferences.map(organization => <li key={organization.id} className={styles.tile}><a href={organization.href} target="_blank" rel="noopener noreferrer" tabIndex={duplicate ? -1 : undefined} translate="no"><OrganizationMark {...organization} /></a></li>)}
        </ul>)}
      </div>
    </div>
    <p className={`container ${styles.note}`}>{t("Logos identify external resources. They do not imply an AUREON partnership, endorsement, certification or regulatory approval.")}</p>
  </section>;
}
