"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import {
  FileText,
  Fingerprint,
  ShieldAlert,
  ScanLine,
  ArrowUpRight,
} from "lucide-react";
import { PublicShell, PageIntro } from "@/components/public/PublicShell";
const documents = [
  {
    href: "/legal/terms",
    icon: FileText,
    title: "Terms of service",
    description:
      "Account eligibility, the transaction review process, plan parameters and the conditions that govern use.",
  },
  {
    href: "/legal/privacy",
    icon: Fingerprint,
    title: "Privacy notice",
    description:
      "The information collected, why it is processed, how it is protected and how to submit a data request.",
  },
  {
    href: "/legal/risk",
    icon: ShieldAlert,
    title: "Risk disclosure",
    description:
      "Market volatility, capital loss, exceptionally high target rates, custody and operational risks.",
  },
  {
    href: "/legal/aml",
    icon: ScanLine,
    title: "AML & identity policy",
    description:
      "Identity review, source-of-funds assessment, transaction review and the limits of current verification.",
  },
];
export default function LegalPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="Legal & disclosures"
        title="The details"
        emphasis="matter."
        description="Read the policies that shape this platform and the risks you should understand before making an investment decision."
        number="08"
      />
      <section className="container public-body-section public-divider">
        <div className="public-legal-cards">
          {documents.map(({ href, icon: Icon, title, description }) => (
            <Link href={href} key={href} className="public-legal-card">
              <Icon size={25} strokeWidth={1.2} />
              <h2>{title}</h2>
              <p>{description}</p>
              <span>
                Read document <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
        </div>
        <p className="plan-caption" style={{ marginTop: 30 }}>
          These are initial policy documents. Operator legal identity,
          jurisdiction, registration details, custody disclosures and counsel
          approval are pending publication. This page makes no claim of
          regulatory authorization.
        </p>
      </section>
    </PublicShell>
  )}</TranslatedContent>;
}
