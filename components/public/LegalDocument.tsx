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
  children,
}: {
  type: LegalType;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
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
          <div className="public-notice">
            <Info size={17} />
            <p>
              Initial policy documentation · pending operator and counsel
              review. The operator’s legal entity, address, applicable
              jurisdiction and regulatory details have not been published. This
              document must be completed and approved before public financial
              operations.
            </p>
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
  );
}
