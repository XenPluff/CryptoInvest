"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { useRef, useState } from "react";
import { RotateCcw, Wifi } from "lucide-react";
import { AureonMark } from "@/components/SiteHeader";
import type { CardNetwork } from "@/lib/cards";
import styles from "./cards.module.css";

export function NetworkMark({ network }: { network: CardNetwork }) {
  useDisplayLocale();
  return <TranslatedContent>{network === "VISA" ? <span className={styles.visa}>VISA</span> : <span className={styles.mastercard}><span className={styles.circles}><i /><i /></span><small>mastercard</small></span>}</TranslatedContent>;
}

export default function CardShowcase({ network: controlled, onNetworkChange }: { network?: CardNetwork; onNetworkChange?: (network: CardNetwork) => void }) {
  useDisplayLocale();
  const [ownNetwork, setNetwork] = useState<CardNetwork>("MASTERCARD");
  const [back, setBack] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const network = controlled ?? ownNetwork;
  function choose(value: CardNetwork) { setNetwork(value); onNetworkChange?.(value); }
  return <TranslatedContent>{<div className={styles.showcase}>
    <div className={styles.selector} aria-label="Card design preference">
      {(["MASTERCARD", "VISA"] as const).map(value => <button type="button" aria-pressed={network === value} key={value} onClick={() => choose(value)}>{value === "VISA" ? "Visa concept" : "Mastercard concept"}</button>)}
    </div>
    <div className={styles.stage} ref={stage} onPointerMove={event => {
      if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--tilt-x", `${((event.clientY - rect.top) / rect.height - .5) * -9}deg`);
      event.currentTarget.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - .5) * 9}deg`);
    }} onPointerLeave={() => { stage.current?.style.setProperty("--tilt-x", "0deg"); stage.current?.style.setProperty("--tilt-y", "0deg"); }}>
      <div className={`${styles.card} ${network === "VISA" ? styles.gold : ""} ${back ? styles.flipped : ""}`} role="img" aria-label={`AUREON ${network === "VISA" ? "Visa" : "Mastercard"} card concept, ${back ? "back" : "front"} view. Not issued; no payment function.`}>
        <div className={`${styles.face} ${styles.front}`} aria-hidden="true">
          <div className={styles.cardOrbit} /><div className={styles.cardBrand}><AureonMark size={30} /><span>AUREON<small>A DIFFERENT PERSPECTIVE</small></span></div>
          <span className={styles.specimen}>CONCEPT / NOT ISSUED</span>
          <div className={styles.chipRow}><span className={styles.chip}><i /><i /><i /></span><Wifi size={23} className={styles.contactless} /></div>
          <div className={styles.masked}>•••• &nbsp;•••• &nbsp;•••• &nbsp;••••</div>
          <div className={styles.cardBottom}><span>AUREON MEMBER<small>DESIGN PREVIEW ONLY</small></span><NetworkMark network={network} /></div>
        </div>
        <div className={`${styles.face} ${styles.back}`} aria-hidden="true">
          <div className={styles.backBrand}><AureonMark size={21} /><span>AUREON / DESIGN STUDY</span></div>
          <div className={styles.stripe} /><div className={styles.signature}><span>SPECIMEN</span><b>***</b></div>
          <div className={styles.backCopy}><strong>CONCEPT / NOT ISSUED</strong><p>No payment function. Issuing bank and program terms are pending. This design is not evidence of a network partnership.</p></div>
          <div className={styles.backBottom}><span>NO CARD NUMBER · NO CREDIT FACILITY</span><NetworkMark network={network} /></div>
        </div>
      </div>
    </div>
    <div className={styles.viewControls}><span>3D DESIGN PREVIEW</span><button type="button" onClick={() => setBack(value => !value)}><RotateCcw size={14} /> Show {back ? "front" : "back"}</button></div>
    <p className={styles.conceptNote}>Visa and Mastercard are shown as design preferences only. No issuing-bank or network partnership is confirmed. Both designs are non-functional concepts.</p>
  </div>}</TranslatedContent>;
}
