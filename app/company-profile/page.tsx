"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download, FileText } from "lucide-react";
import { PageIntro, PublicShell } from "@/components/public/PublicShell";
import profile from "@/public/documents/aureon-company-profile.json";
import styles from "@/components/public/company-profile.module.css";
const topics = [
  ["03–04", "The company & business map"],
  ["05–13", "Nine business perspectives"],
  ["14–15", "Value mechanics & investment plans"],
  ["16–18", "The investor journey & transactions"],
  ["19–20", "Security & the card collection"],
  ["21–23", "Learning, growth & accountability"],
  ["24–25", "Risks, policies & due diligence"],
  ["26–28", "Questions, contacts & resources"],
];

export default function CompanyProfilePage() {
  useDisplayLocale();
  return <TranslatedContent>{<PublicShell>
    <PageIntro eyebrow="The AUREON company profile" title="One company." emphasis="A considered perspective." description="An illustrated guide to the brand, company-reported business activities and the investor experience, brought together in one publication." number="10" />
    <section className={`container ${styles.hero}`} aria-labelledby="profile-title" >
      <figure className={styles.visual}><Image src={profile.cover} alt="Gold orbital sculpture representing AUREON’s perspective and connected capabilities" width={1536} height={1024} sizes="(max-width: 850px) 100vw, 55vw" /><div className={styles.visualBrand}>AUREON<span>COMPANY PROFILE</span></div></figure>
      <div className={styles.copy}>
        <p className="eyebrow">COMPANY PROFILE / EDITION 01</p>
        <h2 id="profile-title">Where value<br /><em>takes shape.</em></h2>
        <p>Explore nine business perspectives, current plan parameters, account processes and the reporting standards that put the details in context. Original sector pictures, card designs, video-guide imagery and process diagrams accompany each relevant section.</p>
        <dl className={styles.facts}><div><dt>Edition</dt><dd>{profile.edition}</dd></div><div><dt>Format</dt><dd>{profile.pageCount} pages · English · PDF</dd></div><div><dt>Download</dt><dd>{(profile.bytes / 1000000).toFixed(1)} MB</dd></div></dl>
        <a href={profile.pdf} download="AUREON-Company-Profile.pdf" className={styles.download}><Download size={17} aria-hidden="true" />Download company profile</a>
        <p className={styles.note}>Plan parameters are a dated snapshot. Review the current website terms and risk information alongside this company overview.</p>
      </div>
    </section>
    <section className={`container ${styles.contents}`} aria-labelledby="profile-contents" >
      <div className={styles.contentsHeading}><FileText size={24} strokeWidth={1.3} aria-hidden="true" /><h2 id="profile-contents">Inside the publication.</h2><p>Full-colour imagery, clickable contents and links back to current information.</p></div>
      <ol>{topics.map(([pages, title]) => <li key={title}><span>{pages}</span><h3>{title}</h3></li>)}</ol>
      <div className={styles.links}><Link href="/approach">Explore business activities <ArrowUpRight size={15} aria-hidden="true" /></Link><Link href="/legal/risk">Read the risk disclosure <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </section>
  </PublicShell>}</TranslatedContent>;
}
