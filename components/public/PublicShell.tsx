import TranslatedContent from "@/components/TranslatedContent";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./public.css";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="public-main">
        <TranslatedContent>{children}</TranslatedContent>
      </main>
      <SiteFooter />
    </>
  );
}

export function PageIntro({
  eyebrow,
  title,
  emphasis,
  description,
  number = "01",
}: {
  eyebrow: string;
  title: string;
  emphasis?: string;
  description: string;
  number?: string;
}) {
  return <TranslatedContent>{(
    <section className="public-intro container">
      <div className="public-breadcrumb">
        <Link href="/">Aureon</Link>
        <span>/</span>
        <span>{eyebrow}</span>
      </div>
      <div className="public-intro-grid">
        <div>
          <p className="eyebrow">
            <span className="public-tiny-rule" />
            {eyebrow}
          </p>
          <h1>
            {title}
            {emphasis && (
              <>
                <br />
                <em>{emphasis}</em>
              </>
            )}
          </h1>
        </div>
        <div className="public-intro-note">
          <span className="public-section-number">{number} / AUREON</span>
          <p>{description}</p>
        </div>
      </div>
    </section>
  )}</TranslatedContent>;
}

export function PublicCTA({
  title = "Your next chapter starts here.",
  text = "Create your account, complete verification, and explore Aureon at your own pace.",
}: {
  title?: string;
  text?: string;
}) {
  return <TranslatedContent>{(
    <section className="public-cta container">
      <div>
        <p className="eyebrow">A considered beginning</p>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <Link href="/register" className="button button-gold">
        Create an account <ArrowUpRight size={16} />
      </Link>
    </section>
  )}</TranslatedContent>;
}
