"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./orbital-globe.module.css";

const COINS = ["btc", "eth", "sol", "usdt", "usdc", "bnb", "xrp"] as const;
type Signal = { coin: typeof COINS[number]; x: number; y: number; cycle: number };

function nextSignal(others: Signal[], previous?: Signal): Signal {
  const choices = COINS.filter(coin => coin !== previous?.coin && !others.some(other => other.coin === coin));
  let x = 0.5, y = 0.5;
  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    x = 0.5 + Math.cos(angle) * (0.28 + Math.random() * 0.06);
    y = 0.5 + Math.sin(angle) * (0.19 + Math.random() * 0.055);
    if (others.every(other => Math.hypot(x - other.x, y - other.y) > 0.23)
      && (!previous || Math.hypot(x - previous.x, y - previous.y) > 0.16)) break;
  }
  return { coin: choices[Math.floor(Math.random() * choices.length)], x, y, cycle: (previous?.cycle ?? -1) + 1 };
}

/** Three staggered, two-second appearances; CSS handles motion without a render loop. */
export default function CryptoSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  useEffect(() => {
    const initial: Signal[] = [];
    for (let i = 0; i < 3; i++) initial.push(nextSignal(initial));
    setSignals(initial);
  }, []);

  function replace(index: number) {
    setSignals(current => current.map((signal, i) => i === index
      ? nextSignal(current.filter((_, j) => j !== index), signal) : signal));
  }

  return <div className={styles.signals} aria-hidden="true">
    {signals.map((signal, index) => <span key={index} className={styles.signal}
      data-crypto-logo={signal.coin} data-cycle={signal.cycle}
      style={{ left: `${signal.x * 100}%`, top: `${signal.y * 100}%`, "--signal-delay": `${index * -2 / 3}s` } as CSSProperties}
      onAnimationIteration={() => replace(index)}>
      <img src={`/images/crypto/${signal.coin}.svg`} alt="" draggable={false} />
    </span>)}
  </div>;
}
