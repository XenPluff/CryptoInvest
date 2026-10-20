import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CreditCard, Globe2, FileCheck2 } from "lucide-react";
import { PageIntro, PublicShell } from "@/components/public/PublicShell";
import CardShowcase from "@/components/cards/CardShowcase";
import styles from "@/components/cards/cards.module.css";

export const metadata: Metadata = { title: "AUREON card concepts & applications", description: "Explore AUREON Visa and Mastercard card design concepts and submit a pre-launch application. Cards are not issued and payment functionality is unavailable." };

export default function CardsPage() {
  return <PublicShell>
    <PageIntro eyebrow="The AUREON card concept" title="A considered design." emphasis="A future possibility." description="Explore two card design concepts, inspect the front and back in 3D, and register your card preferences for preliminary review." number="09" />
    <section className={`container ${styles.publicHero}`}>
      <div className={styles.publicCopy}><span className={styles.phase}>PRE-LAUNCH / NOT ISSUED</span><h2>Your perspective.<br /><em>In every detail.</em></h2><p>Brushed gold. Sculpted charcoal. The AUREON mark. Two distinct design directions for a proposed credit-card experience, with a clear application record in your workspace.</p><p>Applications are expressions of interest for preliminary review. AUREON does not currently issue these cards, provide a credit line or enable card payments.</p><Link href="/dashboard/cards" className={styles.inlineLink}>Apply for pre-launch review <ArrowUpRight size={16} /></Link></div>
      <CardShowcase />
    </section>
    <section className={`container ${styles.program}`} aria-label="Card program availability"><strong>Program status: pre-launch applications only</strong><p>No issuing bank, licensed credit program or Visa/Mastercard partnership has been established in this project. Network selection is a preference. The card designs do not establish affiliation, authorization or availability.</p><p>Worldwide use is not available. A future launch would require an issuing partner, regulatory and network approvals, eligible countries, cardholder agreements, underwriting and operational payment infrastructure.</p></section>
    <figure className={`container ${styles.art}`}><Image src="/images/cards/aureon-card-concepts.png" alt="AI-generated AUREON Visa and Mastercard front and back design concepts, labeled not issued" width={1536} height={1024} sizes="100vw" /><figcaption><span>AI-generated product design study. No payment function.</span><a href="/images/cards/aureon-card-concepts.png" download>Download concept artwork</a></figcaption></figure>
    <section id="program-details" className={`container ${styles.terms}`}>
      <article><CreditCard size={24} strokeWidth={1.2} /><h2>A preference, recorded.</h2><p>Choose a network design and physical or virtual format, provide your country of residence and intended use, and track the preliminary review. These preferences do not guarantee a particular product or eligibility.</p></article>
      <article><Globe2 size={24} strokeWidth={1.2} /><h2>Country rules matter.</h2><p>Any future international use would depend on the issuer, card network, local rules, sanctions, merchant acceptance and account terms. Providing a country in the form is not confirmation of service availability.</p></article>
      <article><FileCheck2 size={24} strokeWidth={1.2} /><h2>Terms before credit.</h2><p>Issuer identity, eligibility, credit assessment, limits, APR, repayment obligations, annual fees, foreign-exchange charges and delivery terms have not been announced. No application fee, credit check or balance deduction occurs in this pre-launch process.</p></article>
    </section>
    <section className={`container ${styles.faq}`}><h2>Know before you apply.</h2>
      <details><summary>Can I use the card now or worldwide?</summary><p>No. These are non-functional design concepts. Cards cannot currently be issued, activated, loaded or used for purchases, cash withdrawals or transfers.</p></details>
      <details><summary>Does an admin decision approve credit?</summary><p>No. Preliminary review can place an applicant on the pre-launch list or decline an application. It does not establish issuer approval, a credit limit, an issued card or a promise to launch.</p></details>
      <details><summary>What information is collected?</summary><p>Your existing account is linked to your preferred network design, card format, country of residence, intended use and recorded consent. Review messages and status history are retained. Do not provide card numbers, CVVs, PINs, bank details or identity documents in this form. Read the <Link href="/legal/privacy">privacy notice</Link>.</p></details>
      <details><summary>What happens after I submit?</summary><p>Follow the status and any review message in your investor workspace. You can withdraw an active application. If a genuine program becomes available, new eligibility, privacy and issuer terms would need to be presented before further processing.</p></details>
    </section>
  </PublicShell>;
}
