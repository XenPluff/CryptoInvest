"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { Panel, Badge, Notice, LoadState, useRemote } from "./shared";
export function ProviderConnections() {
  useDisplayLocale();
  const state = useRemote("/admin/providers");
  const delivery = useRemote("/admin/email-delivery");
  const deposits = state.data?.deposits;
  const email = state.data?.email;
  return <TranslatedContent>{(
    <>
      <Panel title="Deposit wallet addresses" eyebrow="DIRECT CRYPTO DEPOSITS">
        <LoadState {...state} />
        <p className="ws-panel-description">
          Deposits go directly to the supplied receiving addresses. Each asset
          and network uses its matching address below. Submitted transfers are
          reviewed manually before a balance is credited.
        </p>
        {deposits?.wallets?.length ? (
          <div className="ws-wallet-list">
            {deposits.wallets.map(
              (wallet: {
                id: string;
                asset: string;
                network: string;
                address: string;
              }) => (
                <div className="ws-wallet-card" key={wallet.id}>
                  <div className="ws-wallet-heading">
                    <div>
                      <h3>{wallet.asset}</h3>
                      <span>{wallet.network}</span>
                    </div>
                  </div>
                  <code>{wallet.address}</code>
                </div>
              ),
            )}
          </div>
        ) : !state.loading && !state.error ? (
          <Notice>No receiving addresses are configured.</Notice>
        ) : null}
      </Panel>
      <Panel title="Account email" eyebrow="DELIVERY OPERATIONS">
        <LoadState
          loading={delivery.loading}
          error={delivery.error || state.error}
          reload={() => {
            void delivery.reload();
            void state.reload();
          }}
        />
        {email && (
          <div className="ws-inline-status">
            <span>{email.provider || "Email provider"}</span>
            <Badge value={email.configured ? "configured" : "not_configured"} />
          </div>
        )}
        {delivery.data && (
          <>
            <div className="ws-form-row">
              <div>
                <span className="ws-muted">Queued</span>
                <h3>{delivery.data.pending}</h3>
              </div>
              <div>
                <span className="ws-muted">Provider accepted</span>
                <h3>{delivery.data.sent}</h3>
              </div>
              <div>
                <span className="ws-muted">Needs attention</span>
                <h3>{delivery.data.failed}</h3>
              </div>
            </div>
            <p className="ws-panel-description">{delivery.data.note}</p>
          </>
        )}
        <Notice>
          A branded sender requires a domain you own and verification with
          Resend or your SMTP provider. Local test mail is captured by Mailpit.
        </Notice>
      </Panel>
    </>
  )}</TranslatedContent>;
}
