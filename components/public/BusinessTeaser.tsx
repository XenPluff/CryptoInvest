import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { businessActivities } from "@/lib/business-activities";
import styles from "./business.module.css";

export default function BusinessTeaser() {
  return (
    <section className={`container ${styles.teaser}`} aria-labelledby="business-teaser-title" lang="en">
      <figure className={styles.teaserImage}>
        <Image src="/images/strategies/crypto-mining.png" width={1536} height={1024} alt={businessActivities[0].imageAlt} sizes="(max-width: 750px) 100vw, 50vw" />
        <figcaption>AI-generated sector illustration</figcaption>
      </figure>
      <div className={styles.teaserCopy}>
        <p className="eyebrow">The business behind the platform</p>
        <h2 id="business-teaser-title">Where value<br /><em>takes shape.</em></h2>
        <p>Explore AUREON’s company-reported business activities, how each can generate revenue, and the costs, risks and records that put the picture in context.</p>
        <ul className={styles.sectorList}>{businessActivities.map(activity => <li key={activity.id}>{activity.title}</li>)}</ul>
        <Link href="/approach" className={styles.inlineLink}>Explore the business model <ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}
