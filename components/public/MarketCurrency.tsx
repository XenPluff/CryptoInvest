"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale, displayLocale } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Info, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/ui-store";
import { useTranslation } from "@/lib/i18n";

type Currency = "USD" | "EUR" | "GBP";
interface MarketResponse {
  currency: Currency;
  assets: {
    id: string;
    symbol: string;
    name: string;
    price: number;
    change24h: number | null;
  }[];
  updatedAt: string;
  source: string;
  stale: boolean;
}
const copy = {
  en: {
    currency: "Market currency",
    loading: "Loading market prices",
    unavailable: "Market data is taking a pause.",
    pending: "Prices will appear when the live provider is available.",
    fallback: "The live market provider is temporarily unavailable.",
    refresh: "Refresh prices",
    refreshing: "Refreshing",
    previous: "Previously retrieved data",
    live: "Live provider data",
    updated: "Updated",
    failed:
      "The latest refresh failed. Last retrieved prices are shown and may be out of date.",
    asset: "Asset",
    price: "Price",
    change: "24h change",
    unknown: "Unavailable",
    description:
      "Indicative third-party prices in the selected currency, refreshed every minute. Account balances and investment amounts remain in USD. Prices may differ from execution prices.",
  },
};

export function MarketCurrencySelector() {
  useDisplayLocale();
  const currency = usePreferences((state) => state.currency);
  const setCurrency = usePreferences((state) => state.setCurrency);
  const { t: translateCopy } = useTranslation();
  return <TranslatedContent>{(
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        fontSize: 11,
      }}
    >
      <span>{translateCopy(copy.en.currency)}</span>
      <select
        aria-label={translateCopy(copy.en.currency)}
        value={currency}
        onChange={(event) => setCurrency(event.target.value as Currency)}
        style={{
          padding: "7px 10px",
          color: "inherit",
          background: "var(--surface, #121713)",
          border: "1px solid #c9a24b35",
          borderRadius: 4,
        }}
      >
        {(["USD", "EUR", "GBP"] as const).map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  )}</TranslatedContent>;
}

export function MarketCurrency({ compact = false }: { compact?: boolean }) {
  useDisplayLocale();
  const currency = usePreferences((state) => state.currency);
  const { locale, t: translateCopy } = useTranslation();
  const t = Object.fromEntries(Object.entries(copy.en).map(([key, value]) => [key, translateCopy(value)])) as typeof copy.en;
  const [data, setData] = useState<MarketResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setData(null);
    setError("");
    setLoading(true);
    async function load() {
      setRefreshing(true);
      try {
        const result = await api<MarketResponse>(
          `/markets?currency=${currency}`,
          { signal: controller.signal },
        );
        if (result.currency !== currency)
          throw new Error("Market provider returned an unexpected currency.");
        if (active) {
          setData(result);
          setError("");
        }
      } catch (cause) {
        if (active && !controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : translateCopy(copy.en.fallback),
          );
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [currency, request]); // Locale changes formatting without requesting a new quote.
  const current = data?.currency === currency ? data : null;
  const format = (price: number) =>
    new Intl.NumberFormat(displayLocale(), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  const refresh = (
    <button
      className={compact ? "ws-text-button" : "public-inline-button"}
      disabled={refreshing}
      onClick={() => setRequest((value) => value + 1)}
    >
      {refreshing ? t.refreshing : t.refresh} <RefreshCw size={12} />
    </button>
  );
  return <TranslatedContent>{(
    <>
      <div className="public-market-bar" style={{ flexWrap: "wrap", gap: 15 }}>
        <MarketCurrencySelector />
        {!loading && refresh}
      </div>
      {loading || (!current && refreshing) ? (
        <div aria-label={t.loading} aria-busy="true" role="status">
          <div
            className="public-skeleton"
            style={{ height: compact ? 200 : 300 }}
          />
        </div>
      ) : !current ? (
        <div className="public-error" role="status">
          <div>
            <h3>{t.unavailable}</h3>
            <p>
              {error || t.fallback} {t.pending}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="public-market-bar">
            <span className="public-market-live">
              <i
                className="public-dot"
                style={
                  current.stale || error
                    ? { background: "var(--gold)" }
                    : undefined
                }
              />
              {current.stale || error ? t.previous : t.live} · {current.source}
            </span>
            <span>
              {t.updated}{" "}
              {new Date(current.updatedAt).toLocaleString(
                displayLocale(),
                { dateStyle: "medium", timeStyle: "short" },
              )}
            </span>
          </div>
          {error && (
            <p role="status" className="plan-caption">
              {t.failed}
            </p>
          )}
          {compact ? (
            <div className="ws-market-list">
              {current.assets.slice(0, 4).map((asset) => (
                <div className="ws-market-row" key={asset.id}>
                  <span
                    className={`ws-coin ws-coin-${asset.symbol.toLowerCase()}`}
                  >
                    {asset.symbol === "BTC"
                      ? "₿"
                      : asset.symbol === "ETH"
                        ? "Ξ"
                        : asset.symbol[0]}
                  </span>
                  <div>
                    <strong>{asset.name}</strong>
                    <span>{asset.symbol}</span>
                  </div>
                  <div className="ws-market-price">
                    <strong>{format(asset.price)}</strong>
                    <span
                      className={
                        asset.change24h === null
                          ? ""
                          : asset.change24h >= 0
                            ? "ws-positive"
                            : "ws-negative"
                      }
                    >
                      {asset.change24h === null
                        ? t.unknown
                        : `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toLocaleString(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="public-market-table">
                <thead>
                  <tr>
                    <th>{t.asset}</th>
                    <th>
                      {t.price} · {currency}
                    </th>
                    <th>{t.change}</th>
                  </tr>
                </thead>
                <tbody>
                  {current.assets.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <div className="public-asset">
                          <span className="public-asset-mark">
                            {asset.symbol === "BTC"
                              ? "₿"
                              : asset.symbol === "ETH"
                                ? "Ξ"
                                : asset.symbol[0]}
                          </span>
                          <div>
                            <strong>{asset.name}</strong>
                            <small>{asset.symbol}</small>
                          </div>
                        </div>
                      </td>
                      <td>{format(asset.price)}</td>
                      <td
                        className={
                          asset.change24h === null
                            ? ""
                            : asset.change24h >= 0
                              ? "public-positive"
                              : "public-negative"
                        }
                      >
                        {asset.change24h === null ? (
                          t.unknown
                        ) : (
                          <>
                            {asset.change24h >= 0 ? (
                              <ArrowUpRight
                                size={13}
                                style={{
                                  display: "inline",
                                  verticalAlign: "middle",
                                  marginRight: 6,
                                }}
                              />
                            ) : (
                              <ArrowDownRight
                                size={13}
                                style={{
                                  display: "inline",
                                  verticalAlign: "middle",
                                  marginRight: 6,
                                }}
                              />
                            )}
                            {Math.abs(asset.change24h).toLocaleString(locale, {
                              maximumFractionDigits: 2,
                              minimumFractionDigits: 2,
                            })}
                            %
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="plan-caption">
            <Info
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 6,
              }}
            />
            {t.description}
          </p>
        </>
      )}
    </>
  )}</TranslatedContent>;
}
