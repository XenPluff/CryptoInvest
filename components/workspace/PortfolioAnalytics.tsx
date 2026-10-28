"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale, displayLocale } from "@/lib/i18n";
import { useId } from "react";
import { money } from "@/lib/api";
import type {
  AllocationObservation,
  PortfolioAnalyticsResponse,
} from "@/lib/analytics";
import { LoadState } from "./shared";
import { usePortfolioRemote } from "./usePortfolioRemote";
import styles from "./analytics.module.css";

const colors = ["#c9a24b", "#8abf9b", "#9aaee4"];
export function ObservationChart({
  title,
  description,
  points,
  series,
  currency = true,
}: {
  title: string;
  description: string;
  points: { at: string; values: number[] }[];
  series: string[];
  currency?: boolean;
}) {
  useDisplayLocale();
  const id = useId();
  if (!points.length) return null;
  const width = 660,
    height = 240,
    left = 78,
    right = 15,
    top = 17,
    bottom = 35;
  const first = Date.parse(points[0].at),
    last = Date.parse(points[points.length - 1].at);
  const min = points.reduce(
    (lowest, point) =>
      point.values.reduce((value, next) => Math.min(value, next), lowest),
    0,
  );
  const observedMax = points.reduce(
    (highest, point) =>
      point.values.reduce((value, next) => Math.max(value, next), highest),
    0,
  );
  const max = observedMax === min ? (currency ? 100 : 1) : observedMax;
  const span = max - min;
  const x = (at: string) =>
    last === first
      ? (width + left - right) / 2
      : left +
        ((Date.parse(at) - first) / (last - first)) * (width - left - right);
  const y = (value: number) =>
    top + ((max - value) / span) * (height - top - bottom);
  const format = (value: number) =>
    currency ? money(value / 100) : value.toLocaleString(displayLocale());
  const shortDate = (at: string) =>
    new Date(at).toLocaleDateString(displayLocale(), {
      month: "short",
      day: "numeric",
      year: "2-digit",
      timeZone: "UTC",
    });
  return <TranslatedContent>{(
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chart}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>
          {description} {points.length} observed timestamps, from {points[0].at}{" "}
          to {points[points.length - 1].at}. A table of the observations
          follows.
        </desc>
        {[0, 0.5, 1].map((ratio) => {
          const value = max - span * ratio;
          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={width - right}
                y1={top + ratio * (height - top - bottom)}
                y2={top + ratio * (height - top - bottom)}
              />
              <text
                x={left - 10}
                y={top + ratio * (height - top - bottom) + 4}
                textAnchor="end"
              >
                {format(value)}
              </text>
            </g>
          );
        })}
        {series.map((name, seriesIndex) => {
          const path = points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "H"} ${x(point.at)}${index === 0 ? ` ${y(point.values[seriesIndex])}` : ` V ${y(point.values[seriesIndex])}`}`,
            )
            .join(" ");
          return (
            <g key={name}>
              <path
                d={path}
                fill="none"
                stroke={colors[seriesIndex % colors.length]}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              {points.length === 1 && (
                <circle
                  cx={x(points[0].at)}
                  cy={y(points[0].values[seriesIndex])}
                  r="3"
                  fill={colors[seriesIndex % colors.length]}
                />
              )}
            </g>
          );
        })}
        <text x={left} y={height - 8} textAnchor="start">
          {shortDate(points[0].at)}
        </text>
        {points.length > 1 && (
          <text x={width - right} y={height - 8} textAnchor="end">
            {shortDate(points[points.length - 1].at)}
          </text>
        )}
      </svg>
      <div className={styles.legend}>
        {series.map((name, index) => (
          <span key={name}>
            <i style={{ background: colors[index % colors.length] }} />
            {name}
          </span>
        ))}
      </div>
      <details className={styles.details}>
        <summary>
          View observed data{points.length > 50 ? " · latest 50 records" : ""}
        </summary>
        <div className={styles.scroll}>
          <table className={styles.dataTable}>
            <caption className={styles.caption}>
              {title} · UTC timestamps
            </caption>
            <thead>
              <tr>
                <th scope="col">Recorded at</th>
                {series.map((name) => (
                  <th scope="col" key={name}>
                    {name}
                    {currency ? " (USD)" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.slice(-50).map((point) => (
                <tr key={point.at}>
                  <td>
                    <time dateTime={point.at}>
                      {new Date(point.at).toLocaleString(displayLocale(), {
                        dateStyle: "medium",
                        timeStyle: "medium",
                        timeZone: "UTC",
                      })}
                    </time>
                  </td>
                  {point.values.map((value, index) => (
                    <td key={index}>{format(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )}</TranslatedContent>;
}

export function AllocationBars({
  allocation,
  totalCents,
}: {
  allocation: AllocationObservation[];
  totalCents: number;
}) {
  useDisplayLocale();
  return <TranslatedContent>{(
    <div className={styles.allocation}>
      <h3>Active principal by plan</h3>
      {allocation.length ? (
        allocation.map((plan) => (
          <div key={plan.planId} className={styles.allocationRow}>
            <div className={styles.allocationLabel}>
              <span>
                {plan.planName} · {plan.positions}{" "}
                {plan.positions === 1 ? "position" : "positions"}
              </span>
              <strong>
                {money(plan.principalCents / 100)} ·{" "}
                {(totalCents > 0
                  ? (plan.principalCents / totalCents) * 100
                  : 0
                ).toFixed(1)}
                %
              </strong>
            </div>
            <div className={styles.track} aria-hidden="true">
              <span
                style={{
                  width: `${totalCents > 0 ? (plan.principalCents / totalCents) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className={styles.caption}>
          No active investment principal to allocate.
        </p>
      )}
    </div>
  )}</TranslatedContent>;
}

export function PortfolioAnalytics() {
  useDisplayLocale();
  const remote = usePortfolioRemote<PortfolioAnalyticsResponse>("/analytics");
  if (remote.loading || remote.error) return <TranslatedContent>{<LoadState {...remote} />}</TranslatedContent>;
  const data = remote.data!;
  return <TranslatedContent>{(
    <div>
      <div className={styles.summary}>
        <div>
          <span>Available account balance</span>
          <strong>{money(data.summary.availableBalanceCents / 100)}</strong>
        </div>
        <small className={styles.meta}>
          {data.summary.ledgerEntries} posted ledger{" "}
          {data.summary.ledgerEntries === 1 ? "entry" : "entries"} · USD
        </small>
      </div>
      {data.history.length ? (
        <>
          <ObservationChart
            title="Available balance history"
            description="Account balance after each immutable ledger posting. Steps show the balance held between postings; pending deposits and projected investment growth are excluded."
            points={data.history.map((point) => ({
              at: point.at,
              values: [point.balanceCents],
            }))}
            series={["Available balance"]}
          />
          <p className={styles.caption}>
            Posted account activity, including investment allocations and
            withdrawal reserves. This chart shows available balance rather than
            investment performance. Dates are UTC.
          </p>
        </>
      ) : (
        <div className={styles.empty}>
          <strong>Your record starts with real activity.</strong>
          <p>
            A balance history will appear after your first ledger posting. There
            is no recorded balance movement yet.
          </p>
        </div>
      )}
      <AllocationBars
        allocation={data.allocation}
        totalCents={data.summary.activePrincipalCents}
      />
      <div className={styles.stats}>
        <div>
          <span>Settled investment earnings</span>
          <strong>{money(data.summary.realizedEarningsCents / 100)}</strong>
        </div>
        <div>
          <span>Returned principal</span>
          <strong>{money(data.summary.principalReturnedCents / 100)}</strong>
        </div>
        <div>
          <span>Active positions</span>
          <strong>{data.summary.activePositions}</strong>
        </div>
        <div>
          <span>Settled positions</span>
          <strong>{data.summary.settledPositions}</strong>
        </div>
      </div>
      {data.settlements.length > 0 && (
        <details className={styles.details}>
          <summary>View verified settlements</summary>
          <div className={styles.scroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">Plan / settlement date</th>
                  <th scope="col">Original principal</th>
                  <th scope="col">Returned principal</th>
                  <th scope="col">Realized earnings</th>
                </tr>
              </thead>
              <tbody>
                {data.settlements.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.planName}
                      <br />
                      <time dateTime={item.at}>
                        {new Date(item.at).toLocaleDateString(displayLocale(), {
                          timeZone: "UTC",
                        })}
                      </time>
                    </td>
                    <td>{money(item.principalCents / 100)}</td>
                    <td>{money(item.returnedCents / 100)}</td>
                    <td>{money(item.earningsCents / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.caption}>
            Returned principal may be less than the original principal.
            Projected returns are excluded.
          </p>
        </details>
      )}
    </div>
  )}</TranslatedContent>;
}
