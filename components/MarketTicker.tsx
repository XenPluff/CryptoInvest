"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import { usePreferences } from "@/lib/ui-store";
import styles from "./market-ticker.module.css";

const WIDGET_ORIGIN = "https://www.tradingview-widget.com";
const widgetLocales = { en: "en", fr: "fr", de: "de_DE", es: "es", it: "it", ru: "ru", uk: "en", ar: "ar_AE" } as const;
const symbols = [
  { proName: "COINBASE:BTCUSD", description: "Bitcoin / USD" },
  { proName: "COINBASE:ETHUSD", description: "Ethereum / USD" },
  { proName: "COINBASE:USDTUSD", description: "Tether / USD" },
  { proName: "BINANCE:BNBUSDT", description: "BNB / USDT" },
];

export default function MarketTicker() {
  const theme = usePreferences(state => state.theme);
  const { locale, t } = useTranslation();
  const providerLocale = widgetLocales[locale];
  const src = useMemo(() => {
    const configuration = {
      symbols,
      colorTheme: theme,
      isTransparent: true,
      showSymbolLogo: true,
      displayMode: "regular",
      largeChartUrl: "",
    };
    return `${WIDGET_ORIGIN}/embed-widget/ticker-tape/?locale=${providerLocale}#${encodeURIComponent(JSON.stringify(configuration))}`;
  }, [theme, providerLocale]);

  return <div className={styles.band} data-market-provider="tradingview" dir="ltr"
    role="img" aria-label={`TradingView — ${t("Market insights")}`}>
    <iframe key={`${theme}-${providerLocale}`} className={styles.widget}
      src={src} title={`TradingView — ${t("Market insights")}`}
      height={58} loading="lazy" referrerPolicy="origin"
      inert tabIndex={-1} aria-hidden="true" />
  </div>;
}
