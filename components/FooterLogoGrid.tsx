import React from "react";

export type FooterLogo = {
  id: string;
  name: string;
  image: string;
  ink?: boolean;
};

/** Presentational only: its production data contains approved assets, never demo marks. */
export default function FooterLogoGrid({ logos, label }: { logos: readonly FooterLogo[]; label: string }) {
  if (!logos.length) return null;
  return <ul className="footer-logo-grid" aria-label={label}>
    {logos.map(logo => <li key={logo.id}>
      <img src={logo.image} alt={logo.name} width={96} height={44} loading="lazy" draggable={false} translate="no" className={logo.ink ? "footer-logo-ink" : undefined} />
    </li>)}
  </ul>;
}
