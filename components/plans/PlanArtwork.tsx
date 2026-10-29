import { useId } from "react";
import styles from "./plan-frame.module.css";

export function planVariant(slug: string, index = 0) {
  const variants = ["starter", "elite", "gold", "platinum", "shareholder"];
  const known = variants.indexOf(slug.toLowerCase().replace(/-plan$/, ""));
  return variants[known < 0 ? index % variants.length : known];
}

// Static projected surfaces: no canvas, render loop, network asset or random state.
const point = (u: number, v: number, variant: string) => {
  let x: number, y: number, z: number;
  if (variant === "elite") {
    const r = 1 + .32 * v * Math.cos(u);
    x = r * Math.cos(u); y = r * Math.sin(u); z = .36 * Math.sin(2 * u) + .52 * v;
  } else if (variant === "gold") {
    const r = .95 + .43 * v * Math.cos(u / 2);
    x = r * Math.cos(u); y = r * Math.sin(u); z = .75 * v * Math.sin(u / 2);
  } else if (variant === "platinum") {
    const r = .32 + .58 * v * v;
    x = r * Math.cos(u + v); y = r * Math.sin(u + v); z = 1.12 * v;
  } else if (variant === "shareholder") {
    const r = .72 + .27 * Math.cos(3 * u) + .12 * v;
    x = r * Math.cos(2 * u); y = r * Math.sin(2 * u); z = .48 * Math.sin(3 * u) + .26 * v;
  } else {
    const r = .32 + .48 * Math.cos(v * Math.PI / 2);
    x = r * Math.cos(u + v * .8); y = r * Math.sin(u + v * .8); z = v + .14 * Math.sin(3 * u);
  }
  const rx = x * .86 + z * .51, rz = -x * .51 + z * .86;
  const ry = y * .66 - rz * .75;
  return `${(160 + rx * 80).toFixed(2)},${(107 + ry * 69).toFixed(2)}`;
};
const curve = (samples: number, position: (t: number) => string) =>
  Array.from({ length: samples + 1 }, (_, i) => position(i / samples)).join(" ");

export function PlanArtwork({ variant }: { variant: string }) {
  const id = useId().replace(/:/g, "");
  return <div className={styles.art} aria-hidden="true">
    <svg viewBox="0 0 320 220" fill="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-ink`} x1="65" y1="25" x2="260" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--plan-highlight)" />
          <stop offset=".42" stopColor="var(--plan-accent)" />
          <stop offset="1" stopColor="var(--plan-deep)" />
        </linearGradient>
      </defs>
      <g stroke="currentColor" opacity=".16" strokeWidth=".65">
        <path d="M24 181 160 213 296 181 160 150Z M58 173 194 205 M92 165 228 197 M126 157 262 189 M58 189 194 157 M92 197 228 165 M126 205 262 173" />
        <path d="M19 31v-9h9M292 22h9v9M19 184v9h9M292 193h9v-9" />
      </g>
      <ellipse cx="160" cy="185" rx="75" ry="10" fill="var(--plan-accent)" opacity=".045" />
      <g className={styles.sculpture} stroke={`url(#${id}-ink)`} strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round">
        {Array.from({ length: 29 }, (_, i) => <polyline key={`contour-${i}`} points={curve(96, t => point(t * Math.PI * 2, -1 + i / 14, variant))} opacity={.42 + .45 * (i / 28)} />)}
        {Array.from({ length: 15 }, (_, i) => <polyline key={`seam-${i}`} points={curve(40, t => point(i / 15 * Math.PI * 2, t * 2 - 1, variant))} opacity=".28" strokeWidth=".55" />)}
      </g>
      <g fill="currentColor" opacity=".4">
        <circle cx="19" cy="107" r="1.3" /><circle cx="301" cy="107" r="1.3" />
        <path d="M156 208h8v1h-8zM159.5 205v7h1v-7z" />
      </g>
    </svg>
  </div>;
}
