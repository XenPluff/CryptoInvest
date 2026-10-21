"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Radio } from "lucide-react";
import { api, money } from "@/lib/api";
type Market = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
};
const placeholders = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "tether", symbol: "USDT", name: "Tether" },
];
export default function MarketTicker() {
  useDisplayLocale();
  const [assets, setAssets] = useState<Market[]>([]);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await api<{ assets: Market[]; stale?: boolean }>(
          "/markets",
        );
        if (!cancelled) {
          setAssets(result.assets);
          setStale(!!result.stale);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    const timer = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return <TranslatedContent>{(
    <div className="market-band">
      <div className="container market-inner">
        <div className="market-label">
          <Radio size={15} />
          <span>
            THE MARKET
            <br />
            <strong>
              {error
                ? "FEED UNAVAILABLE"
                : stale
                  ? "LAST AVAILABLE"
                  : "AT A GLANCE"}
            </strong>
          </span>
        </div>
        {(assets.length ? assets.slice(0, 4) : placeholders).map((a) => {
          const market = a as Market;
          return (
            <a href={`/insights#${a.id}`} className="ticker-asset" key={a.id}>
              <span className={`coin-icon coin-${a.symbol.toLowerCase()}`}>
                {a.symbol === "BTC"
                  ? "₿"
                  : a.symbol === "ETH"
                    ? "Ξ"
                    : a.symbol === "SOL"
                      ? "≋"
                      : "₮"}
              </span>
              <div>
                <span className="asset-name">
                  {a.name} <small>{a.symbol.toUpperCase()}</small>
                </span>
                <span className="asset-price">
                  {market.price != null ? money(market.price) : "—"}
                  {market.change24h != null && (
                    <small
                      className={
                        market.change24h >= 0 ? "positive" : "negative"
                      }
                    >
                      {market.change24h >= 0 ? (
                        <ArrowUpRight size={11} />
                      ) : (
                        <ArrowDownRight size={11} />
                      )}{" "}
                      {Math.abs(market.change24h).toFixed(2)}%
                    </small>
                  )}
                </span>
              </div>
              <span className="ticker-signal" aria-hidden="true">
                {market.change24h == null
                  ? "—"
                  : market.change24h >= 0
                    ? "↗"
                    : "↘"}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  )}</TranslatedContent>;
}
