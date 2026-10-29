"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { LegalDocument } from "@/components/public/LegalDocument";
import styles from "./risk-document.module.css";
export default function RiskPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <LegalDocument
      type="risk"
      title="Risk disclosure."
      description="Digital assets and multi-sector investments carry substantial risk. Read this information before transferring assets or purchasing an investment plan."
      notice={null}
    >
      <section className={styles.document} aria-labelledby="risk-document-title">
        <header className={styles.header}>
          <span className={styles.brand} translate="no">AUREON</span>
          <span className={styles.ornament} aria-hidden="true"><i /></span>
          <h2 id="risk-document-title">Risk disclosure</h2>
          <p className={styles.status}>Proposed arrangements · Not established</p>
        </header>
        <div className={styles.body}>
          <p>
            Digital assets and diversified multi-sector investments are speculative,
            subject to market volatility, and carry a high degree of risk, including
            potential illiquidity and the loss of the entire principal investment.
            AUREON investments are not bank deposits and are not insured or
            guaranteed by any government agency, financial protection corporation,
            or central banking authority.
          </p>
          <p>
            AUREON would operate through affiliated entities and registered
            divisions encompassing digital asset services and multi-sector
            real-world asset management. Entity formation, registrations and
            applicable permissions would be completed before activities requiring
            them begin. The regulatory treatment of private equity, digital
            currency operations and commodity-backed initiatives depends on the
            jurisdiction and the specific activity.
          </p>
          <p>
            Custody, trading and execution arrangements for digital assets and
            traditional financial market instruments would follow applicable
            compliance requirements and depend on the relevant entities,
            permissions and controls. Standard deposit insurance schemes and
            statutory ombudsman services do not automatically extend to all
            specialized asset classes, alternative commodities or decentralized
            financial activities.
          </p>
          <p>
            The investment offering would be directed at sophisticated investors,
            accredited institutions and qualified individuals with the risk
            tolerance and financial expertise to evaluate alternative asset
            portfolios. Distribution would be subject to applicable eligibility
            terms and effective access controls; this statement alone does not
            establish investor eligibility or an offering exemption.
          </p>
          <p>
            AUREON Ventures would serve as the brand name for an AUREON investment
            collective. Its intended investment areas include cryptocurrency
            mining, financial market trading, real estate management,
            agricultural development, solar energy infrastructure, tangible
            physical assets, natural resources and precious metals, automated
            arbitrage systems, artificial intelligence and robotics, and
            strategic venture investments.
          </p>
          <p>
            Institutional products and fund structures would be supported by
            independent audits and operational reporting. Past performance,
            algorithmic returns and projected yields in mining, commodities or
            emerging technologies do not guarantee future results. Displayed
            target rates and time-based estimates are illustrations, separate
            from posted realized earnings and available account funds.
          </p>
          <p>
            The AUREON Digital Unit (AUDU) would be a digital representation with
            issuance and management by AUREON Asset Management and backing from
            operational reserve structures. Issuance and access would depend on
            issuer registration, documented reserve and redemption arrangements,
            regulatory availability, jurisdictional compliance and individual
            account eligibility.
          </p>
          <p>
            AUREON Group LLC would be the entity name for the collective.
            Registration of AUREON, the AUREON logo and associated branding as
            trademarks or service marks would be pursued through the applicable
            registries.
          </p>
        </div>
        <footer className={styles.footer}>
          <p>© 2026 AUREON. All rights reserved.</p>
          <p className={styles.version} translate="no">AUR-2026.04.1</p>
        </footer>
      </section>
    </LegalDocument>
  )}</TranslatedContent>;
}
