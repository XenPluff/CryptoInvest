"use client";
import { RefreshCw } from "lucide-react";
import { displayLocale, useDisplayLocale } from "@/lib/i18n";
export function PortfolioRefresh({ refreshing, refreshError, updatedAt, reload, automaticSettlement }: {
  automaticSettlement?: { enabled: boolean };
  refreshing: boolean; refreshError: string; updatedAt: string | null; reload: () => void;
}) {
  useDisplayLocale();
  return <div className="ws-portfolio-refresh">
    <div>
      <span className={`ws-refresh-dot ${refreshError ? "ws-refresh-stale" : ""}`} />
      {automaticSettlement?.enabled && <span>Automatic settlement enabled</span>}
      <span>{refreshError ? "Showing last confirmed update" : "Updates automatically"}</span>
      {updatedAt && <time dateTime={updatedAt} translate="no">{new Date(updatedAt).toLocaleTimeString(displayLocale(), { hour: "2-digit", minute: "2-digit" })}</time>}
    </div>
    <button type="button" className="ws-text-button" onClick={reload} disabled={refreshing} aria-label="Refresh portfolio">
      <RefreshCw size={14} className={refreshing ? "ws-spin" : ""} /> Refresh
    </button>
    {refreshError && <p role="status">Could not refresh account data. The amounts shown are from the last successful update.</p>}
  </div>;
}
