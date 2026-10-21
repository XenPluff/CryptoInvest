"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  Fingerprint,
  FileCheck2,
  LockKeyhole,
  Activity,
  ArrowUpRight,
  Info,
} from "lucide-react";
import {
  PublicShell,
  PageIntro,
  PublicCTA,
} from "@/components/public/PublicShell";
const controls = [
  {
    icon: KeyRound,
    title: "Your account. Your control.",
    body: "Passwords are hashed before storage. Sessions use HTTP-only cookies, and account access requires email verification before investing.",
    status: "Implemented",
    pending: false,
  },
  {
    icon: Fingerprint,
    title: "A second layer of access.",
    body: "Authenticator-based two-factor authentication can be enabled in account settings. Login and sensitive financial actions support one-time codes.",
    status: "Available in your account",
    pending: false,
  },
  {
    icon: FileCheck2,
    title: "Verification before investment.",
    body: "An identity review is required before purchasing a plan or requesting a withdrawal. Submissions remain subject to operator approval.",
    status: "Identity review workflow",
    pending: false,
  },
  {
    icon: ShieldCheck,
    title: "Direct deposit destinations.",
    body: "Deposits use the supplied receiving wallet addresses for each supported asset and network. Transfers are reviewed manually before balances are credited; no third-party deposit provider is required.",
    status: "Supplied wallet addresses",
    pending: false,
  },
  {
    icon: LockKeyhole,
    title: "Independent assurance.",
    body: "A completed third-party penetration test, custody audit and insurance policy have not been published here. No certification or coverage is implied.",
    status: "External assurance pending",
    pending: true,
  },
  {
    icon: Activity,
    title: "Regulatory transparency.",
    body: "The operator’s legal identity, registered address, licensing scope and permitted jurisdictions must be published before a public financial launch.",
    status: "Operator details pending",
    pending: true,
  },
];
export default function SecurityPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="Security & transparency"
        title="Trust is built"
        emphasis="in the details."
        description="Know how account protection works, understand the boundaries, and see exactly which external assurances still need to be provided."
        number="04"
      />
      <section className="container public-body-section public-divider">
        <div className="public-section-top">
          <div>
            <p className="eyebrow">Protection, explained</p>
            <h2>Clarity at every layer.</h2>
          </div>
          <p>
            Understand the account controls currently available and the external
            assurances still awaiting publication. Security claims should be
            specific and verifiable.
          </p>
        </div>
        <div className="public-pillar-grid">
          {controls.map(({ icon: Icon, title, body, status, pending }) => (
            <article key={title} className="public-pillar">
              <Icon />
              <h3>{title}</h3>
              <p>{body}</p>
              <span className={`public-status ${pending ? "pending" : ""}`}>
                <i />
                {status}
              </span>
            </article>
          ))}
        </div>
      </section>
      <section className="container public-body-section public-divider public-security-grid">
        <div>
          <p className="eyebrow">Your funds, step by step</p>
          <h2>
            Understand the route
            <br />
            before you begin.
          </h2>
          <p>
            Cryptocurrency transfers are generally irreversible. Funding stays
            unavailable until it has been explicitly enabled by the operator.
            Deposits require an actual blockchain transaction and operator
            review before any account credit.
          </p>
          <p>
            Aureon does not describe the displayed deposit addresses as insured
            or independently audited. Do not transfer assets until you have
            reviewed the operator’s published legal and custody information.
          </p>
          <Link className="public-inline-button" href="/legal/risk">
            Read the complete risk disclosure <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="public-custody-steps">
          <div className="public-custody-step">
            <span>01</span>
            <div>
              <strong>Verify the network and destination.</strong>
              <p>
                The asset and blockchain network must match the selected deposit
                instructions.
              </p>
            </div>
          </div>
          <div className="public-custody-step">
            <span>02</span>
            <div>
              <strong>Submit your transaction reference.</strong>
              <p>
                A submitted reference enters review. It does not immediately
                create a cleared balance.
              </p>
            </div>
          </div>
          <div className="public-custody-step">
            <span>03</span>
            <div>
              <strong>Review and account credit.</strong>
              <p>
                The operator must verify the transfer and approve the confirmed
                amount.
              </p>
            </div>
          </div>
          <div className="public-custody-step">
            <span>04</span>
            <div>
              <strong>Withdrawal review and payment.</strong>
              <p>
                Requests reserve available funds. Payment is only recorded after
                operator action and a transaction reference.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="container public-body-section">
        <div className="public-notice">
          <Info size={18} />
          <span>
            Help protect your account: use a unique passphrase, enable
            two-factor authentication, verify the site address, and never share
            passwords or authenticator codes. Suspect account activity?{" "}
            <Link href="/support">Contact support</Link> promptly. Support will
            never need your private wallet key.
          </span>
        </div>
      </section>
      <PublicCTA title="Begin with understanding." />
    </PublicShell>
  )}</TranslatedContent>;
}
