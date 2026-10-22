"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import { ArrowUpRight, Aperture, Compass, Scale } from "lucide-react";
import styles from "./about.module.css";
import {
  PublicShell,
  PageIntro,
  PublicCTA,
} from "@/components/public/PublicShell";
export default function AboutPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="About Aureon"
        title="A different"
        emphasis="perspective."
        description="Digital asset investing deserves clarity. We are building an experience that makes the details visible and gives every decision room to be considered."
        number="05"
      />
      <section id="who-we-are" className={`container public-body-section public-divider ${styles.section}`} aria-labelledby="who-we-are-title">
        <div className={styles.overview}>
          <h2 id="who-we-are-title">Who We Are</h2>
          <div className={styles.copy}>
            <p>AUREON is structured around the principle that durable business value is created through productive assets, disciplined investment, responsible management and the ability to adapt to changing economic conditions.</p>
            <p>Our proposed model combines direct operating activities, strategic investments and financial-market opportunities within a governed corporate structure.</p>
            <p>We seek to evaluate each investment according to its expected economic contribution, capital requirements, operating costs, liquidity, risk profile and potential impact on the wider company.</p>
            <p>AUREON does not treat diversification as a substitute for due diligence. Each proposed investment must satisfy appropriate financial, operational, legal and risk-management requirements.</p>
          </div>
        </div>
        <div className={styles.approach}>
          <h3>Our approach</h3>
          <ol className={styles.steps}>
            {[
              ["Identify", "We identify potential opportunities through market research, industry analysis, commercial partnerships and evaluation of business fundamentals."],
              ["Evaluate", "We assess financial projections, expected cash flows, valuation, management capability, liquidity, counterparty exposure and downside scenarios."],
              ["Allocate", "Capital is allocated according to approved investment limits, strategic priorities and the company's overall risk capacity."],
              ["Monitor", "Investments are monitored against defined performance measures, budgets, operational milestones and risk thresholds."],
              ["Optimise", "Where appropriate, we reinvest earnings, improve operating efficiency, restructure exposures or exit investments whose fundamentals no longer support continued ownership."],
            ].map(([title, text], index) => (
              <li key={title}>
                <span className={styles.number} aria-hidden="true">0{index + 1}</span>
                <h4>{title}</h4>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="container public-body-section public-divider public-mission">
        <div className="public-mission-visual" aria-hidden="true">
          <div className="public-mission-orbit" />
          <div className="public-mission-orbit second" />
          <span className="public-mission-monogram">A</span>
          <div className="public-mission-caption">
            <span>AUREON</span>
            <span>DESIGNED WITH INTENT</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">The idea behind Aureon</p>
          <h2>
            Less noise.
            <br />
            More perspective.
          </h2>
          <p>
            Markets move quickly. A considered investment experience should help
            you slow down: understand the terms, inspect the risks, and see the
            status of your account without ambiguity.
          </p>
          <p>
            Aureon brings registration, identity verification, plan information,
            transaction records and account controls into one coherent
            interface. Every account starts with real records. Every transfer
            has a review status. A target rate is always described as a target.
          </p>
          <Link className="public-inline-button" href="/security">
            Explore our approach to transparency <ArrowUpRight size={14} />
          </Link>
          <p><Link className="public-inline-button" href="/company-profile">Download the company profile <ArrowUpRight size={14} /></Link></p>
        </div>
      </section>
      <section className="container public-body-section public-divider">
        <div className="public-section-top">
          <div>
            <p className="eyebrow">The business behind the platform</p>
            <h2>Where value takes shape.</h2>
          </div>
          <p>
            Explore AUREON’s company-reported activities across digital
            infrastructure, markets, property, agriculture, energy, physical
            assets, AI/robotics and strategic business investments, with an
            explanation of revenue, costs, risks and reporting.
          </p>
        </div>
        <Link className="public-inline-button" href="/approach">
          Explore the business model <ArrowUpRight size={14} />
        </Link>
      </section>
      <section className="container public-body-section public-divider">
        <div className="public-section-top">
          <div>
            <p className="eyebrow">Our principles</p>
            <h2>Designed with intention.</h2>
          </div>
          <p>
            Good design should make important information easier to understand.
            These principles guide the experience.
          </p>
        </div>
        <div className="public-pillar-grid">
          <article className="public-pillar">
            <Aperture />
            <h3>Clarity over complexity.</h3>
            <p>
              Show what matters, explain the terms, and keep the next step
              visible. Distinguish illustrative projections from actual
              transaction records.
            </p>
          </article>
          <article className="public-pillar">
            <Compass />
            <h3>Deliberate by design.</h3>
            <p>
              A calm interface gives you room to assess your options. Recorded
              account activity is distinguished from projections, and the terms
              stay visible.
            </p>
          </article>
          <article className="public-pillar">
            <Scale />
            <h3>Transparency as a standard.</h3>
            <p>
              Account controls are described specifically. External
              certifications, insurance and operator licensing are only stated
              when supporting details are available.
            </p>
          </article>
        </div>
      </section>
      <section className="container public-body-section public-divider">
        <div className="public-section-top">
          <div>
            <p className="eyebrow">The people & the entity</p>
            <h2>Know who you invest with.</h2>
          </div>
          <p>
            Operator identity, leadership, registered address, jurisdiction and
            regulatory scope are awaiting publication. No team biographies or
            endorsements are presented without verification.
          </p>
        </div>
        <div className="public-notice">
          <Scale size={18} />
          <span>
            Public financial operations require complete operator disclosures
            and applicable approvals. Review{" "}
            <Link href="/legal">legal information</Link> and obtain independent
            advice before transferring funds.
          </span>
        </div>
      </section>
      <PublicCTA title="Make your next decision an informed one." />
    </PublicShell>
  )}</TranslatedContent>;
}
