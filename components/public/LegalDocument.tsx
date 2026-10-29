import TranslatedContent from "@/components/TranslatedContent";
import type { ReactNode } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { PublicShell, PageIntro } from "./PublicShell";
export type LegalType = "terms" | "privacy" | "risk" | "aml";
const links = [
  { slug: "terms", label: "Terms of service" },
  { slug: "privacy", label: "Privacy notice" },
  { slug: "risk", label: "Risk disclosure" },
  { slug: "aml", label: "AML & identity policy" },
];
export function LegalDocument({
  type,
  title,
  description,
  notice = "Initial policy documentation · pending operator and counsel review. The operator’s legal entity, address, applicable jurisdiction and regulatory details have not been published. This document must be completed and approved before public financial operations.",
  children,
}: {
  type: LegalType;
  title: string;
  description: string;
  notice?: string;
  children: ReactNode;
}) {
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="Legal & disclosures"
        title={title}
        description={description}
        number="08"
      />
      <section className="container public-body-section public-divider public-legal-grid">
        <nav className="public-legal-nav" aria-label="Legal documents">
          {links.map((link) => (
            <Link
              key={link.slug}
              href={`/legal/${link.slug}`}
              className={type === link.slug ? "active" : ""}
              aria-current={type === link.slug ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <article className="public-legal-content">
          <p className="legal-language-note">Original documents are in English. Translations are provided for convenience.</p>
          <div className="public-notice">
            <Info size={17} />
            <p>{notice}</p>
          </div>
          {children}
          <h2>Questions & contact</h2>
          <p>
            Send questions or rights requests through the{" "}
            <Link href="/support">support contact form</Link>. A verified legal
            contact and registered address will be added when the operator
            publishes its legal details.
          </p>
        </article>
      </section>
    </PublicShell>
  )}</TranslatedContent>;
}
