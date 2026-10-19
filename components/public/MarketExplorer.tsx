"use client";
import { useEffect, useState } from "react";
import { RefreshCw, ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { api, money } from "@/lib/api";
interface MarketResponse {
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
export function MarketExplorer() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  async function load() {
    setRefreshing(true);
    try {
      const result = await api<MarketResponse>("/markets");
      setData(result);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The market data provider is unavailable.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => clearInterval(timer);
  }, []);
  if (loading)
    return (
      <div aria-label="Loading market prices" aria-busy="true">
        <div className="public-skeleton" style={{ height: 340 }} />
      </div>
    );
  if (error && !data)
    return (
      <div className="public-error" role="status">
        <div>
          <h3>Market data is taking a pause.</h3>
          <p>{error} Prices will appear when the live provider is available.</p>
        </div>
        <button
          className="public-inline-button"
          disabled={refreshing}
          onClick={() => void load()}
        >
          Refresh prices <RefreshCw size={14} />
        </button>
      </div>
    );
  if (!data) return null;
  return (
    <>
      <div className="public-market-bar">
        <span className="public-market-live">
          <i
            className="public-dot"
            style={
              data.stale || error ? { background: "var(--gold)" } : undefined
            }
          />
          {data.stale || error
            ? "Previously retrieved data"
            : "Live provider data"}{" "}
          · {data.source}
        </span>
        <span>
          Updated{" "}
          {new Date(data.updatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        <button
          className="public-inline-button"
          onClick={() => void load()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing" : "Refresh"} <RefreshCw size={12} />
        </button>
      </div>
      {error && (
        <p role="status" className="plan-caption">
          The latest refresh failed. Last retrieved prices are shown and may be
          out of date.
        </p>
      )}
      <div style={{ overflowX: "auto" }}>
        <table className="public-market-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Price · USD</th>
              <th>24h change</th>
            </tr>
          </thead>
          <tbody>
            {data.assets.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <div className="public-asset">
                    <span className="public-asset-mark">
                      {asset.symbol.toUpperCase() === "BTC"
                        ? "₿"
                        : asset.symbol.toUpperCase() === "ETH"
                          ? "Ξ"
                          : asset.symbol[0].toUpperCase()}
                    </span>
                    <div>
                      <strong>{asset.name}</strong>
                      <small>{asset.symbol}</small>
                    </div>
                  </div>
                </td>
                <td>{money(asset.price)}</td>
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
                    <span style={{ color: "var(--muted)" }}>Unavailable</span>
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
                      {Math.abs(asset.change24h).toFixed(2)}%
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="plan-caption">
        <Info
          size={12}
          style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}
        />
        Indicative third-party market data, refreshed every minute. Prices may
        differ from execution prices. No orders are placed through this view.
      </p>
    </>
  );
}
