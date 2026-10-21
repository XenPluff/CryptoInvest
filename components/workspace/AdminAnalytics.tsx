"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale, displayLocale } from "@/lib/i18n";
import { money } from "@/lib/api";
import type { AdminAnalyticsResponse } from "@/lib/analytics";
import { AllocationBars, ObservationChart } from "./PortfolioAnalytics";
import { LoadState, Panel, useRemote } from "./shared";
import styles from "./analytics.module.css";

export function AdminAnalytics() {
  useDisplayLocale();
  const remote = useRemote<AdminAnalyticsResponse>("/admin/analytics");
  if (remote.loading || remote.error)
    return <TranslatedContent>{(
      <Panel title="Platform analytics">
        <LoadState {...remote} />
      </Panel>
    )}</TranslatedContent>;
  const data = remote.data!;
  return <TranslatedContent>{(
    <>
      <div className="ws-two-column">
        <Panel
          title="Verified funding activity"
          eyebrow="ACTUAL ACCOUNT RECORDS"
        >
          <div className={styles.summary}>
            <div>
              <span>Net funding · deposits less paid withdrawals</span>
              <strong>{money(data.summary.netFundingCents / 100)}</strong>
            </div>
            <small className={styles.meta}>Cumulative · USD</small>
          </div>
          {data.history.length ? (
            <ObservationChart
              title="Verified deposits and paid withdrawals"
              description="Cumulative verified deposit ledger credits and withdrawals recorded paid. Each step occurs at an actual posting or review timestamp. Investor registrations appear as timestamps with no change to funding totals."
              points={data.history.map((point) => ({
                at: point.at,
                values: [
                  point.verifiedDepositsCents,
                  point.paidWithdrawalsCents,
                ],
              }))}
              series={["Verified deposits", "Paid withdrawals"]}
            />
          ) : (
            <div className={styles.empty}>
              <strong>No recorded funding activity.</strong>
              <p>
                Charts will use actual posted deposits and completed withdrawals
                when available.
              </p>
            </div>
          )}
          <p className={styles.caption}>
            Deposits are investor funding. These amounts do not represent
            revenue or profit. Paid withdrawal dates reflect recorded operator
            review, not blockchain confirmation time.
          </p>
        </Panel>
        <Panel title="Investor account growth" eyebrow="REGISTERED INVESTORS">
          <div className={styles.summary}>
            <div>
              <span>Registered investor accounts</span>
              <strong>
                {data.summary.registeredInvestors.toLocaleString(displayLocale())}
              </strong>
            </div>
            <small className={styles.meta}>
              Excludes administrator accounts
            </small>
          </div>
          {data.history.length ? (
            <ObservationChart
              title="Registered investor accounts"
              description="Cumulative investor registrations at recorded account creation timestamps. No projected account growth is included."
              points={data.history.map((point) => ({
                at: point.at,
                values: [point.investors],
              }))}
              series={["Registered investors"]}
              currency={false}
            />
          ) : (
            <div className={styles.empty}>
              <strong>No investor registrations yet.</strong>
              <p>
                New account registrations will appear here after they are
                recorded.
              </p>
            </div>
          )}
        </Panel>
      </div>
      <Panel title="Investment operations" eyebrow="SETTLED AND ACTIVE">
        <div
          className={styles.stats}
          style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}
        >
          <div>
            <span>Active principal</span>
            <strong>{money(data.summary.activePrincipalCents / 100)}</strong>
          </div>
          <div>
            <span>Realized earnings credited to investors</span>
            <strong>{money(data.summary.investorEarningsCents / 100)}</strong>
          </div>
          <div>
            <span>Principal returned to investors</span>
            <strong>{money(data.summary.returnedPrincipalCents / 100)}</strong>
          </div>
          <div>
            <span>Positions · active / settled</span>
            <strong>
              {data.summary.activePositions} / {data.summary.settledPositions}
            </strong>
          </div>
        </div>
        <AllocationBars
          allocation={data.allocation}
          totalCents={data.summary.activePrincipalCents}
        />
        <p className={styles.caption}>
          Current active positions and immutable settlement credits. Projections
          and unverified deposits are excluded.
        </p>
      </Panel>
    </>
  )}</TranslatedContent>;
}
