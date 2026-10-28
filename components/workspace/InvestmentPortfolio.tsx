"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Search, TrendingUp } from "lucide-react";
import TranslatedContent, { Verbatim } from "@/components/TranslatedContent";
import { LiveInvestmentDisplay } from "@/components/LiveInvestmentDisplay";
import { money } from "@/lib/api";
import { useDisplayLocale } from "@/lib/i18n";
import { Badge, DateText, Empty, LoadState, Panel, type RecordData } from "./shared";
import { usePortfolioRemote } from "./usePortfolioRemote";
import { PortfolioRefresh } from "./PortfolioRefresh";

export function InvestmentPortfolio() {
  useDisplayLocale();
  const remote = usePortfolioRemote("/investments");
  const [filter, setFilter] = useState("ALL"), [search, setSearch] = useState("");
  if (remote.loading || remote.error) return <LoadState {...remote} />;
  const positions: RecordData[] = remote.data?.investments ?? [];
  const summary = remote.data!.summary;
  const visible = positions.filter(position => (filter === "ALL" || position.status === filter)
    && `${position.planName} ${position.id}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <TranslatedContent><>
    <PortfolioRefresh {...remote} />
    <div className="ws-stats-grid ws-portfolio-summary">
      {[
        ["Active principal", money(summary.activePrincipalCents / 100), "Capital in active plans"],
        ["Realized earnings", money(summary.realizedEarningsCents / 100), "Posted investment earnings"],
        ["Principal returned", money(summary.principalReturnedCents / 100), "Recorded settlement proceeds"],
        ["Settled investments", String(summary.settledPositions), "Completed settlements"],
      ].map(([label, value, note], index) => <div className={`ws-stat-card ${index === 1 ? "ws-stat-featured" : ""}`} key={label}>
        <div className="ws-stat-top"><span>{label}</span><TrendingUp size={17} /></div>
        <strong data-portfolio-stat={index === 1 ? "realized-earnings" : undefined}>{value}</strong>
        <span className="ws-stat-note">{note}</span>
      </div>)}
    </div>
    <div className="ws-portfolio-heading">
      <div><span className="ws-eyebrow">YOUR PORTFOLIO</span><h2>Every investment, in focus.</h2>
        <p>Realized earnings are posted income. Active plan targets are estimates and are shown separately.</p></div>
      <Link href="/dashboard/plans" className="ws-button ws-button-gold">Explore plans <ArrowUpRight size={15} /></Link>
    </div>
    {positions.length > 0 ? <>
      <div className="ws-portfolio-toolbar">
        <div className="ws-portfolio-filters" role="group" aria-label="Filter investments">
          {[["ALL", "All investments", positions.length], ["ACTIVE", "Active", summary.activePositions], ["SETTLED", "Settled", summary.settledPositions]].map(([value, label, count]) =>
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(String(value))}>{label}<span>{count}</span></button>)}
        </div>
        <label className="ws-portfolio-search"><Search size={16} /><span className="sr-only">Search investments</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search investments" /></label>
      </div>
      {visible.length ? <div className="ws-investments-grid ws-portfolio-positions">
        {visible.map(position => <Panel key={position.id} title={`${position.planName} plan`} action={<Badge value={position.status} />}>
          <div className="ws-position-principal"><span>Original principal</span><strong>{money(position.principalAmount)}</strong></div>
          {position.status === "ACTIVE" ? <LiveInvestmentDisplay planType={position.planSlug}
            principalAmount={position.principalAmount} startTimestamp={position.startTimestamp}
            durationDays={position.durationDays} dailyRate={position.dailyRate} monthlyRate={position.monthlyRate} />
            : <div className="ws-position-settlement"><div className="ws-settlement-title"><Check size={17} /><span>Settlement recorded</span></div>
              <dl><div><dt>Principal returned</dt><dd>{money(position.principalReturned)}</dd></div>
                <div><dt>Realized earnings</dt><dd data-position-earnings={position.id}>{money(position.earnedAmount)}</dd></div>
                <div className="ws-settlement-total"><dt>Total proceeds</dt><dd>{money((position.principalReturnedCents + position.earnedCents) / 100)}</dd></div>
                <div><dt>Net result</dt><dd className={position.principalReturnedCents + position.earnedCents < position.principalCents ? "ws-negative" : "ws-positive"}>{money((position.principalReturnedCents + position.earnedCents - position.principalCents) / 100)}</dd></div></dl>
              <p>Posted to your account <DateText value={position.settledAt} /></p></div>}
          {position.status === "ACTIVE" && <div className="ws-investment-realized"><span>Realized earnings</span><strong data-position-earnings={position.id}>{money(position.earnedAmount)}</strong></div>}
          {position.status === "ACTIVE" && Date.now() >= new Date(position.startTimestamp).getTime() + position.durationDays * 86400000 && <p className="ws-position-pending">Term ended. Awaiting settlement.</p>}
          <dl className="ws-position-dates"><div><dt>Started</dt><dd><DateText value={position.startTimestamp} /></dd></div>
            <div><dt>{position.status === "SETTLED" ? "Settled" : "Term ends"}</dt><dd><DateText value={position.status === "SETTLED" ? position.settledAt : new Date(new Date(position.startTimestamp).getTime() + position.durationDays * 86400000).toISOString()} /></dd></div></dl>
          <details className="ws-position-reference"><summary>Investment reference</summary><Verbatim>{position.id}</Verbatim></details>
        </Panel>)}
      </div> : <Panel><Empty title="No matching investments">Try another plan name or reference, or reset your filters.<br /><button type="button" className="ws-text-button" onClick={() => { setSearch(""); setFilter("ALL"); }}>Reset filters</button></Empty></Panel>}
    </> : <Panel><Empty title="Your investment story starts here">Choose a plan to begin building your portfolio.<br /><Link className="ws-button ws-button-gold" href="/dashboard/plans">Explore plans <ArrowUpRight size={15} /></Link></Empty></Panel>}
  </></TranslatedContent>;
}
