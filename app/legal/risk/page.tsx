"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { LegalDocument } from "@/components/public/LegalDocument";
const riskNotice = "Proposed arrangements · The entities, registrations, insurance, guarantees, institutional products, audits, reserve structures and trademark registrations described below are proposed. Their existence, approval or availability has not been established by this disclosure.";
export default function RiskPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <LegalDocument
      type="risk"
      title="Risk disclosure."
      description="Digital assets and multi-sector investments carry substantial risk. Read this information before transferring assets or purchasing an investment plan."
      notice={riskNotice}
    >
      <p>
        Digital assets and diversified multi-sector investments are speculative,
        subject to market volatility, and carry a high degree of risk, including
        potential illiquidity and the loss of the entire principal investment.
        AUREON investments are not bank deposits. Insurance or guarantees from a
        government agency, financial protection corporation or central banking
        authority are proposed only and have not been established. No such
        protection should be assumed.
      </p>
      <p>
        AUREON proposes operating through affiliated entities and registered
        divisions encompassing digital asset services and multi-sector real-world
        asset management. Entity formation, registrations and applicable
        permissions remain subject to completion and approval. The regulatory
        treatment of private equity, digital currency operations and
        commodity-backed initiatives depends on the jurisdiction and the
        specific activity.
      </p>
      <p>
        Proposed custody, trading and execution arrangements for digital assets
        and traditional financial market instruments are intended to follow
        applicable compliance requirements, subject to establishing the relevant
        entities, permissions and controls. Standard deposit insurance schemes
        and statutory ombudsman services do not automatically extend to all
        specialized asset classes, alternative commodities or decentralized
        financial activities.
      </p>
      <p>
        The proposed investment offering is intended for sophisticated investors,
        accredited institutions and qualified individuals with the risk
        tolerance and financial expertise to evaluate alternative asset
        portfolios. Any restricted offering would require applicable eligibility
        terms and effective distribution controls; this statement alone does not
        establish investor eligibility or an offering exemption.
      </p>
      <p>
        AUREON Ventures is a proposed brand name for an AUREON investment
        collective with interests spanning cryptocurrency mining, financial
        market trading, real estate management, agricultural development, solar
        energy infrastructure, tangible physical assets, natural resources and
        precious metals, automated arbitrage systems, artificial intelligence
        and robotics, and strategic venture investments. This proposed structure
        does not establish particular portfolio holdings.
      </p>
      <p>
        Designated institutional products, independently audited reports and
        verified fund structures are proposed arrangements. This disclosure
        does not establish completed audits or verified investment performance.
        Past performance, algorithmic returns and projected yields in mining,
        commodities or emerging technologies do not guarantee future results.
        Displayed target rates and time-based estimates are illustrations,
        separate from posted realized earnings and available account funds.
      </p>
      <p>
        The AUREON Digital Unit (AUDU) is a proposed digital representation, with
        proposed issuance and management by AUREON Asset Management and a
        proposed operational reserve structure. Issuance, issuer registration,
        reserve backing and redemption arrangements have not been established
        by this disclosure. AUDU should not be treated as an available,
        reserve-backed instrument on the basis of this proposal. Any future
        access would depend on regulatory availability, jurisdictional
        compliance and individual account eligibility.
      </p>
      <p>
        AUREON Group LLC is a proposed entity name. Registration of AUREON, the
        AUREON logo and associated branding as trademarks or service marks is
        proposed; this disclosure does not establish incorporation, trademark
        registration or ownership by that proposed entity.
      </p>
      <p>© 2026 AUREON. All rights reserved.</p>
      <p translate="no">AUR-2026.04.1</p>
    </LegalDocument>
  )}</TranslatedContent>;
}
