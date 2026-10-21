"use client";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import HeroArtwork from "./HeroArtwork";
import { useRef, useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Fingerprint,
  Globe2,
  Layers3,
  ChevronRight,
  Plus,
  Minus,
  Check,
  Mail,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import MarketTicker from "./MarketTicker";
import { PublishedAnnouncements } from "./public/Journal";
import { VideoTeaser } from "./public/VideoLibrary";
import BusinessTeaser from "./public/BusinessTeaser";
import CardTeaser from "./cards/CardTeaser";
import InvestorPerspective from "./public/InvestorPerspective";
import { api } from "@/lib/api";
const reveal = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const plans = [
  {
    name: "Starter",
    number: "01",
    rate: "2.5",
    period: "day",
    min: "100",
    max: "1,999",
    days: "7 days",
    description: "Your first step towards a broader perspective.",
    tag: "THE FIRST CHAPTER",
  },
  {
    name: "Elite",
    number: "02",
    rate: "3.0",
    period: "day",
    min: "2,000",
    max: "9,999",
    days: "7 days",
    description: "An elevated approach to your next chapter.",
    tag: "A NEW PERSPECTIVE",
  },
  {
    name: "Gold",
    number: "03",
    rate: "4.0",
    period: "day",
    min: "10,000",
    max: "49,999",
    days: "7 days",
    description: "A considered allocation. A wider horizon.",
    tag: "THE SIGNATURE COLLECTION",
    featured: true,
  },
];
const questions = [
  [
    "What makes Aureon different?",
    "Aureon brings investment records, digital-asset deposit instructions, and portfolio tracking into one considered workspace. You see what is settled, what is pending, and what is a target estimate.",
  ],
  [
    "How do the investment plans work?",
    "Each plan specifies an investment range, duration, and target rate. Review the plan and risk disclosure before allocating funds. Target returns are illustrative, are not guaranteed, and are separate from your available balance.",
  ],
  [
    "How are deposits verified?",
    "You submit the transaction hash and selected network. An authorized operator must independently verify the transfer and its confirmations before crediting the ledger. A submitted hash alone never increases your balance.",
  ],
  [
    "Can I withdraw my funds?",
    "Verified users can request withdrawals from their available balance when funding is enabled. Requests are reviewed, and the transaction hash is recorded when a payment is sent. Funds allocated to an active investment are unavailable until settled.",
  ],
];
export default function Landing() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [faq, setFaq] = useState<number | null>(0);
  const [email, setEmail] = useState("");
  const [subscription, setSubscription] = useState("");
  const [busy, setBusy] = useState(false);
  const story = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced || !story.current) return;
    let cleanup: undefined | (() => void);
    let disposed = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([g, s]) => {
        if (disposed) return;
        g.gsap.registerPlugin(s.ScrollTrigger);
        const ctx = g.gsap.context(() => {
          g.gsap.fromTo(
            ".perspective-line",
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                trigger: story.current,
                start: "top 80%",
                end: "bottom 50%",
                scrub: 1,
              },
            },
          );
        }, story);
        cleanup = () => ctx.revert();
      },
    );
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [reduced]);
  async function subscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (new FormData(e.currentTarget).get("newsletter-consent") !== "on")
      return;
    setBusy(true);
    try {
      await api("/newsletter", {
        method: "POST",
        body: JSON.stringify({ email, consent: true }),
      });
      setSubscription("You’re on the list. Thank you for your interest.");
      setEmail("");
    } catch (e) {
      setSubscription(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero">
          <div className="hero-grid-bg" />
          <div className="container hero-inner">
            <motion.div
              className="hero-copy"
              initial={reduced ? false : "hidden"}
              animate="visible"
              variants={reveal}
              transition={{ duration: 1, ease: [0.2, 0.65, 0.3, 1] }}
            >
              <p className="eyebrow">
                <span className="tiny-line" />{" "}
                {t("A HIGHER STANDARD OF DIGITAL WEALTH")}
              </p>
              <h1>
                {t("Your wealth.")}
                <br />
                {t("A new")} <em>{t("perspective.")}</em>
              </h1>
              <p className="hero-description">
                {t("Beyond the noise. Beyond the ordinary.")}
                <br />
                {t("A considered approach to digital assets, designed")}
                <br className="desktop-break" />{" "}
                {t("for those who see further.")}
              </p>
              <div className="hero-ctas">
                <Link className="button button-gold" href="/plans">
                  {t("Explore opportunities")} <ArrowUpRight size={18} />
                </Link>
                <Link className="text-link" href="#philosophy">
                  {t("The Aureon approach")}{" "}
                  <span>
                    <ArrowRight size={15} />
                  </span>
                </Link>
              </div>
              <div className="hero-principles">
                <span>
                  <ShieldCheck size={15} /> {t("Security in the details")}
                </span>
                <i />
                <span>
                  <Globe2 size={15} /> {t("A global perspective")}
                </span>
              </div>
            </motion.div>
            <div className="hero-art">
              <div className="orbit-label orbit-label-top">
                <span className="crosshair">+</span>
                <span>
                  {t("PRECISION IN EVERY ORBIT")}
                  <br />
                  <small>{t("THE AUREON SPHERE — 001")}</small>
                </span>
              </div>
              <div className="orbital-aura" />
              <HeroArtwork />
              <div className="art-coordinate coordinate-left">
                37° 46′ 49″ N
              </div>
              <div className="art-coordinate coordinate-right">
                {t("THE LONG VIEW ↗")}
              </div>
              <div className="art-caption">
                <span className="gold-dot" /> {t("A WORLD OF POSSIBILITY.")}
                <span className="caption-line" />
              </div>
            </div>
          </div>
          <div className="container hero-bottom">
            <span>{t("AN EXCEPTIONAL JOURNEY STARTS WITH PERSPECTIVE.")}</span>
            <a href="#philosophy">
              {t("SCROLL TO DISCOVER")} <ArrowDown size={14} />
            </a>
          </div>
        </section>
        <MarketTicker />
        <PublishedAnnouncements />
        <VideoTeaser />
        <section
          className="perspective-section section-space"
          id="philosophy"
          ref={story}
        >
          <div className="container">
            <motion.div
              className="section-heading split-heading"
              initial={{ opacity: 1, y: 16 }}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={reveal}
              transition={{ duration: 0.8 }}
            >
              <div>
                <p className="eyebrow">
                  <span>01</span> {t("THE AUREON APPROACH")}
                </p>
                <h2>
                  {t("Built on conviction.")}
                  <br />
                  <em>{t("Designed for clarity.")}</em>
                </h2>
              </div>
              <p>
                {t("In a world that moves fast, perspective is everything.")}
                <br />
                {t("We bring intention, clarity, and considered design")}
                <br className="desktop-break" />{" "}
                {t("to your digital investment journey.")}
              </p>
            </motion.div>
            <div className="perspective-line" />
            <div className="principle-grid">
              {[
                {
                  icon: ShieldCheck,
                  n: "01",
                  title: "Confidence, by design.",
                  text: "Clear records. Deliberate controls. A transparent view of every step, from verification to settlement.",
                  link: "Explore our security",
                  href: "/security",
                },
                {
                  icon: Layers3,
                  n: "02",
                  title: "Your ambition. Your approach.",
                  text: "Five distinct investment tiers. One considered experience. Explore an allocation that fits your perspective.",
                  link: "Find your investment plan",
                  href: "/plans",
                },
                {
                  icon: Fingerprint,
                  n: "03",
                  title: "A more personal perspective.",
                  text: "Your portfolio in focus. Your decisions in context. A workspace built around the way you see the future.",
                  link: "Discover your workspace",
                  href: "/register",
                },
              ].map((p, i) => (
                <motion.article
                  className="principle"
                  key={p.n}
                  initial={{ opacity: 1, y: 16 }}
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={reveal}
                  transition={{ duration: 0.7, delay: i * 0.12 }}
                >
                  <div className="principle-top">
                    <p.icon strokeWidth={1} size={32} />
                    <span>/{p.n}</span>
                  </div>
                  <h3>{t(p.title)}</h3>
                  <p>{t(p.text)}</p>
                  <Link href={p.href}>
                    {t(p.link)}
                    <ArrowUpRight size={16} />
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
        <BusinessTeaser rotateImages />
        <section className="plans-section section-space">
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">
                  <span>02</span> {t("A COLLECTION OF OPPORTUNITIES")}
                </p>
                <h2>
                  {t("For every ambition,")}
                  <br />
                  <em>{t("a considered path.")}</em>
                </h2>
              </div>
              <Link href="/plans" className="text-link">
                {t("Discover all five plans")}{" "}
                <span>
                  <ArrowUpRight size={17} />
                </span>
              </Link>
            </div>
            <div className="landing-plans">
              {plans.map((p) => (
                <article
                  className={`landing-plan ${p.featured ? "featured" : ""}`}
                  key={p.name}
                >
                  <div className="plan-card-top">
                    <span className="eyebrow">{t(p.tag)}</span>
                    <span>{p.number}</span>
                  </div>
                  <h3>
                    {p.name}
                    <span>↗</span>
                  </h3>
                  <p>{t(p.description)}</p>
                  <div className="plan-rate">
                    {p.rate}
                    <span>
                      %<small>/ {t(p.period)}</small>
                    </span>
                  </div>
                  <span className="target-caption">
                    {t("ILLUSTRATIVE TARGET RATE")}
                  </span>
                  <div className="plan-card-details">
                    <div>
                      <span>{t("Investment range")}</span>
                      <strong>
                        ${p.min} – ${p.max}
                      </strong>
                    </div>
                    <div>
                      <span>{t("Investment duration")}</span>
                      <strong>{t(p.days)}</strong>
                    </div>
                  </div>
                  <Link
                    href={`/plans#${p.name.toLowerCase()}`}
                    className={`button ${p.featured ? "button-gold" : "button-outline"}`}
                  >
                    {t("Explore")} {p.name}
                    <ArrowUpRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
            <p className="plans-disclosure">
              <ShieldCheck size={13} />{" "}
              {t(
                "A clear perspective on risk. Target returns are illustrative and never guaranteed.",
              )}{" "}
              <Link href="/legal/risk">
                {t("Read our risk disclosure")} <ArrowUpRight size={12} />
              </Link>
            </p>
          </div>
        </section>
        <CardTeaser />
        <section className="journey-section section-space">
          <div className="container journey-layout">
            <div>
              <p className="eyebrow">
                <span>03</span> {t("YOUR NEXT CHAPTER")}
              </p>
              <h2>
                {t("An intentional start.")}
                <br />
                <em>{t("A wider horizon.")}</em>
              </h2>
              <p className="section-intro">
                {t("A clear path from your first question")}
                <br />
                {t("to your next investment decision.")}
              </p>
              <Link href="/register" className="button button-gold">
                {t("Begin your journey")} <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="journey-steps">
              {[
                [
                  "01",
                  "Make it yours.",
                  "Create your account, verify your email, and set up your security preferences.",
                ],
                [
                  "02",
                  "Establish your foundation.",
                  "Complete identity verification and review the investment terms and risks.",
                ],
                [
                  "03",
                  "Move with perspective.",
                  "Once approved, fund your account and manage your allocations from one clear workspace.",
                ],
              ].map(([n, title, text]) => (
                <div className="journey-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{t(title)}</h3>
                    <p>{t(text)}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <InvestorPerspective />
        <section className="faq-section section-space">
          <div className="container faq-layout">
            <div>
              <p className="eyebrow">
                <span>04</span> {t("CLARITY COMES FIRST")}
              </p>
              <h2>
                {t("A few questions.")}
                <br />
                <em>{t("Considered answers.")}</em>
              </h2>
              <p className="section-intro">
                {t("An informed decision starts with")}
                <br />
                {t("a better understanding.")}
              </p>
              <Link href="/support" className="text-link">
                {t("Visit our help center")}{" "}
                <span>
                  <ArrowUpRight size={16} />
                </span>
              </Link>
            </div>
            <div className="faq-list">
              {questions.map(([q, a], i) => (
                <div
                  className={`faq-item ${faq === i ? "is-open" : ""}`}
                  key={t(q)}
                >
                  <button
                    aria-expanded={faq === i}
                    aria-controls={`faq-${i}`}
                    onClick={() => setFaq(faq === i ? null : i)}
                  >
                    <span>{t(q)}</span>
                    {faq === i ? <Minus size={17} /> : <Plus size={17} />}
                  </button>
                  <div id={`faq-${i}`} hidden={faq !== i}>
                    <p>{t(a)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="newsletter-section">
          <div className="container newsletter-inner">
            <div>
              <p className="eyebrow">{t("A PERSPECTIVE WORTH SHARING")}</p>
              <h2>
                {t("Stay a step")} <em>{t("ahead.")}</em>
              </h2>
              <p>
                {t(
                  "Occasional insights. A considered point of view. Delivered to you.",
                )}
              </p>
            </div>
            <form onSubmit={subscribe}>
              <label className="sr-only" htmlFor="newsletter-email">
                {t("Your email address")}
              </label>
              <div className="newsletter-input">
                <Mail size={16} />
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  placeholder={t("Your email address")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={busy}
                  aria-label={t("Subscribe to insights")}
                >
                  {busy ? "…" : <ArrowUpRight size={22} />}
                </button>
              </div>
              <label className="newsletter-consent">
                <input type="checkbox" name="newsletter-consent" required />
                <span>
                  {t(
                    "I agree to receive occasional insights by email and accept the",
                  )}{" "}
                  <Link href="/legal/privacy">{t("Privacy Policy")}</Link>.
                </span>
              </label>
              <p aria-live="polite">
                {subscription ? t(subscription) : t("Unsubscribe anytime.")}
              </p>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
