"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen, ChartNoAxesCombined, Fingerprint, Layers3, Scale, ScanLine } from "lucide-react";
import { PageIntro, PublicShell } from "@/components/public/PublicShell";
import { businessActivities } from "@/lib/business-activities";
import styles from "@/components/public/business.module.css";

const standards = [
  { icon: Fingerprint, title: "An identifiable operator", text: "Registered entities, jurisdictions, responsible people and the exact scope of applicable permissions should be available for verification." },
  { icon: Layers3, title: "Rights to the assets", text: "Ownership, contractual interests, custody, liens and third-party obligations should be supported by records. A photograph or wallet balance alone cannot establish these rights." },
  { icon: ChartNoAxesCombined, title: "Results after costs", text: "Revenue, expenses, realized gains and losses, unrealized valuations and fees should be reported separately for a defined period and reconciled to source statements." },
  { icon: ScanLine, title: "Assets and liabilities together", text: "Account records should be reconciled to bank, wallet, broker and custody evidence, including pending withdrawals, borrowings and other obligations." },
  { icon: BookOpen, title: "Documented expertise", text: "Named team members, roles and dated work history should support experience claims. Independent reviews should identify the reviewer, scope, date and limitations." },
  { icon: Scale, title: "Clear investor rights", text: "Agreements should explain allocations, fees, redemption terms, liquidity constraints, conflicts and how losses are treated. A business overview does not establish an entitlement to income." },
];

export default function ApproachPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro eyebrow="How value is generated" title="Where value" emphasis="takes shape." description="Digital infrastructure. Productive assets. Financial markets. Intelligent technology. A closer look at the commercial logic, costs and evidence behind AUREON’s stated business activities." number="08" />
      <section className={`container ${styles.context}`} aria-label="About these business descriptions">
        <span className={styles.kicker}>COMPANY-REPORTED ACTIVITIES</span>
        <p>AUREON identifies the following areas as current business activities and investment interests.</p>
      </section>

      <nav className={`container ${styles.index}`} aria-label="Explore business activities">
        {businessActivities.map(activity => <a href={`#${activity.id}`} key={activity.id}><span>{activity.number}</span>{activity.title}<ArrowDown size={12} /></a>)}
      </nav>

      <section className={`container ${styles.activities}`} aria-label="Business activity profiles">
        {businessActivities.map(activity => <article key={activity.id} id={activity.id} className={styles.activity} aria-labelledby={`${activity.id}-title`}>
          <figure className={styles.artwork}>
            <Image src={`/images/strategies/${activity.id}.png`} alt={activity.imageAlt} width={1536} height={1024} sizes="(max-width: 900px) 100vw, 50vw" />
            <figcaption><a href={`/images/strategies/${activity.id}.png`} download aria-label={`Download ${activity.title} artwork`}>Download artwork <ArrowUpRight size={11} /></a></figcaption>
          </figure>
          <div className={styles.activityBody}>
            <div className={styles.activityEyebrow}><span>{activity.theme}</span><span>/{activity.number}</span></div>
            <h2 id={`${activity.id}-title`}>{activity.profileTitle ?? activity.title}</h2>
            <p className={styles.summary}>{activity.summary}</p>
            <div className={styles.revenue}><h3>How revenue can arise</h3><p>{activity.revenue}</p></div>
            {activity.considerations && <div className={styles.revenue}><h3>Performance considerations</h3><p>{activity.considerations}</p></div>}
            <div className={styles.keyRisk}><h3>Key risk</h3><p>{activity.risk}</p>{activity.operatingLimits && <p>{activity.operatingLimits}</p>}</div>
            <details className={styles.detail}>
              <summary>Costs & evidence to assess</summary>
              <div><h3>What determines the margin</h3><p>{activity.margin}</p><h3>Records that should support the activity</h3><p>{activity.evidence}</p></div>
            </details>
          </div>
        </article>)}
      </section>

      <section className={`container ${styles.economics}`} aria-labelledby="economics-title">
        <div className={styles.sectionHeading}><div><p className="eyebrow">Understanding the economics</p><h2 id="economics-title">Revenue is a starting point.<br /><em>Net results tell the story.</em></h2></div><p>Each activity has its own costs, timing and exposure. Operating income and asset values must be assessed alongside liabilities and losses.</p></div>
        <ol className={styles.flow}>
          <li><span>01 / RECEIPTS</span><h3>Gross revenue</h3><p>Actual sales, fees or realized trading receipts.</p></li>
          <li><span>02 / DEDUCTIONS</span><h3>Costs & losses</h3><p>Operating costs, financing, fees, taxes and losses.</p></li>
          <li><span>03 / RECONCILIATION</span><h3>Net result</h3><p>A reconciled outcome for a defined period, which may be negative.</p></li>
          <li><span>04 / AGREED RIGHTS</span><h3>Any allocation</h3><p>Subject to applicable agreements, obligations and available liquidity.</p></li>
        </ol>
        <p className={styles.flowNote}>This is an explanatory framework, not a financial statement or a description of a verified allocation formula. Company revenue does not automatically become investor earnings. Target estimates are not settled profits or available account funds.</p>
      </section>

      <section id="transparency" className={`container ${styles.transparency}`} aria-labelledby="transparency-title">
        <div className={styles.sectionHeading}><div><p className="eyebrow">A framework for accountability</p><h2 id="transparency-title">Clarity in the method.<br /><em>Evidence in the detail.</em></h2></div><p>Reliability is assessed through records, controls and independent scrutiny. The standards below describe what investors should be able to evaluate.</p></div>
        <div className={styles.standards}>{standards.map(standard => <article key={standard.title}><standard.icon size={24} strokeWidth={1.2} /><h3>{standard.title}</h3><p>{standard.text}</p></article>)}</div>
        <p className={styles.reportingNote}>These are reporting standards to assess, not a claim that every document or review is already available. No audited performance report, completed independent security review or jurisdiction-specific legal opinion is published on this page.</p>
        <div className={styles.bottomLinks}><Link href="/how-it-works">Understand the account process <ArrowUpRight size={14} /></Link><Link href="/videos">Watch the video guides <ArrowUpRight size={14} /></Link><Link href="/support#contact">Ask about supporting records <ArrowUpRight size={14} /></Link></div>
      </section>

      <section className={`container ${styles.closing}`}>
        <p className="eyebrow">An informed perspective</p><h2>Understand the activity.<br /><em>Consider the whole picture.</em></h2>
        <p>Several sectors can be affected by the same economic conditions. Diversification does not remove risk, establish profitability or guarantee a return. Capital can be lost, including your entire investment.</p>
        <Link href="/legal/risk" className={styles.inlineLink}>Read the full risk disclosure <ArrowUpRight size={15} /></Link>
      </section>
    </PublicShell>
  )}</TranslatedContent>;
}
