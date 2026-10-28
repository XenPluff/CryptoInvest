"use client";
import { useId, useState } from "react";
import styles from "./orbital-globe.module.css";
export default function GlobePoster() {
  const [missing, setMissing] = useState(false), id = useId().replaceAll(":", "");
  if (!missing) return <img className={styles.poster} src="/images/hero/aureon-orbital-globe.png" alt="" aria-hidden="true" draggable={false} onError={() => setMissing(true)} />;
  return <svg className={styles.poster} viewBox="0 0 600 600" aria-hidden="true">
    <defs><radialGradient id={id}><stop stopColor="#334345" /><stop offset=".7" stopColor="#142021" /><stop offset="1" stopColor="#080f11" /></radialGradient></defs>
    <circle cx="300" cy="300" r="146" fill={`url(#${id})`} stroke="#9cb9b6" strokeOpacity=".3" />
    {[0, 45, 90, 135].map(angle => <ellipse key={angle} cx="300" cy="300" rx="145" ry="55" fill="none" stroke="#c9a24b" strokeOpacity=".2" transform={`rotate(${angle} 300 300)`} />)}
    {[-32, 38, 75].map((angle, i) => <ellipse key={angle} cx="300" cy="300" rx={215 + i * 9} ry={77 + i * 17} fill="none" stroke={i === 1 ? "#9bc7cf" : "#d5b46a"} strokeOpacity=".65" strokeWidth="1.3" transform={`rotate(${angle} 300 300)`} />)}
    <circle cx="483" cy="211" r="3" fill="#fff1c6" /><circle cx="135" cy="389" r="2.5" fill="#bdeaf1" />
  </svg>;
}
