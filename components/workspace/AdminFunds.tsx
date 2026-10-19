"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/api";
import {
  ActionForm,
  Badge,
  DateText,
  Empty,
  Field,
  LoadState,
  Notice,
  Panel,
  type RecordData,
  useRemote,
} from "./shared";

function AccountOptions({ users }: { users: RecordData[] }) {
  return (
    <>
      <option value="">Select an investor</option>
      {users
        .filter((user) => user.role === "USER")
        .map((user) => (
          <option value={user.id} key={user.id}>
            {user.name} ({user.email}) · {money(user.balance)}
          </option>
        ))}
    </>
  );
}
function FinancialProof() {
  return (
    <>
      <Field
        label="Reason and review note"
        name="note"
        required
        minLength={15}
      />
      <Field
        label="Current authenticator code"
        name="code"
        required
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoComplete="one-time-code"
      />
      <label className="ws-checkbox">
        <input type="checkbox" required /> I have checked the accounts, amount,
        and supporting records.
      </label>
    </>
  );
}
function Ledger({ userId }: { userId: string }) {
  const ledger = useRemote(`/admin/users/${userId}/ledger`);
  return (
    <Panel title="Account ledger" eyebrow="RECORDED BALANCE">
      <LoadState {...ledger} />
      {ledger.data && (
        <p className="ws-panel-description">
          Available balance: <strong>{money(ledger.data.balance)}</strong>
        </p>
      )}
      {ledger.data?.entries?.length ? (
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Entry</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.data.entries.map((entry: RecordData) => (
                <tr key={entry.id}>
                  <td>
                    {entry.kind.replaceAll("_", " ")}
                    <small className="ws-mono">{entry.referenceId}</small>
                  </td>
                  <td>
                    <DateText value={entry.createdAt} />
                  </td>
                  <td>{money(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !ledger.loading && !ledger.error ? (
        <Empty title="No ledger entries">
          This account has no recorded balance activity.
        </Empty>
      ) : null}
    </Panel>
  );
}
export function BalanceManagement() {
  const users = useRemote("/admin/users");
  const [selected, setSelected] = useState("");
  const [nonce, setNonce] = useState("");
  const [done, setDone] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => setNonce(crypto.randomUUID()), []);
  return (
    <>
      <Panel title="Investor balances" eyebrow="AVAILABLE USD">
        <LoadState {...users} />
        {users.data?.users?.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Available balance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.data.users
                  .filter((user: RecordData) => user.role === "USER")
                  .map((user: RecordData) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </td>
                      <td>{money(user.balance)}</td>
                      <td>
                        <button
                          className="ws-button ws-button-small"
                          onClick={() => setSelected(user.id)}
                        >
                          View ledger
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : !users.loading && !users.error ? (
          <Empty title="No investors yet">
            Investor balances will appear when accounts are registered.
          </Empty>
        ) : null}
      </Panel>
      <div className="ws-two-column">
        <Panel
          title="Adjust an investor balance"
          eyebrow="AUDITED CREDIT OR DEBIT"
        >
          <p className="ws-panel-description">
            Record a supported correction or reconciled credit. Debits cannot
            exceed available funds. Every adjustment is a new entry with your
            identity, reason, and reference.
          </p>
          <ActionForm
            key={nonce}
            path="/admin/balance-adjustments"
            submit="Record balance adjustment"
            disabled={done || !nonce}
            transform={(data) => ({ ...data, idempotencyKey: nonce })}
            onSuccess={() => {
              setDone(true);
              setRevision((value) => value + 1);
              void users.reload();
            }}
          >
            <Field label="Investor account" name="userId" required>
              <select
                name="userId"
                required
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <AccountOptions users={users.data?.users || []} />
              </select>
            </Field>
            <Field label="Adjustment direction" name="direction">
              <select name="direction">
                <option value="credit">Credit balance</option>
                <option value="debit">Debit balance</option>
              </select>
            </Field>
            <Field
              label="Adjustment amount (USD)"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
            <Field
              label="Supporting reconciliation reference"
              name="externalReference"
              required
              minLength={8}
            />
            <FinancialProof />
          </ActionForm>
          {done && (
            <button
              className="ws-button"
              onClick={() => {
                setNonce(crypto.randomUUID());
                setDone(false);
              }}
            >
              New adjustment
            </button>
          )}
        </Panel>
        {selected ? (
          <Ledger key={`${selected}:${revision}`} userId={selected} />
        ) : (
          <Notice>
            Select an investor to inspect the recorded ledger before making a
            change.
          </Notice>
        )}
      </div>
    </>
  );
}
export function TransferManagement() {
  const users = useRemote("/admin/users");
  const transfers = useRemote("/admin/transfers");
  const [nonce, setNonce] = useState("");
  const [done, setDone] = useState(false);
  const [review, setReview] = useState<RecordData | null>(null);
  useEffect(() => setNonce(crypto.randomUUID()), []);
  return (
    <>
      <Notice>
        These transfers move available USD balances between AUREON accounts.
        Cryptocurrency payouts use the withdrawal review and transaction-hash
        reconciliation workflow.
      </Notice>
      <Panel
        title="Create an account transfer"
        eyebrow="RESERVE, REVIEW, THEN SETTLE"
      >
        <LoadState {...users} />
        <p className="ws-panel-description">
          The sender’s balance is reserved immediately. Approval credits the
          recipient; declining restores the sender’s funds. Both accounts must
          have verified email, approved identity, and two-factor authentication.
        </p>
        <ActionForm
          key={nonce}
          path="/admin/transfers"
          submit="Queue transfer for review"
          disabled={done || !nonce}
          transform={(data) => ({ ...data, idempotencyKey: nonce })}
          onSuccess={() => {
            setDone(true);
            void transfers.reload();
            void users.reload();
          }}
        >
          <div className="ws-form-row">
            <Field label="Sender account" name="fromUserId" required>
              <select name="fromUserId" required>
                <AccountOptions users={users.data?.users || []} />
              </select>
            </Field>
            <Field label="Recipient account" name="toUserId" required>
              <select name="toUserId" required>
                <AccountOptions users={users.data?.users || []} />
              </select>
            </Field>
          </div>
          <Field
            label="Transfer amount (USD)"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
          <FinancialProof />
        </ActionForm>
        {done && (
          <button
            className="ws-button"
            onClick={() => {
              setNonce(crypto.randomUUID());
              setDone(false);
            }}
          >
            New transfer
          </button>
        )}
      </Panel>
      <Panel title="Transfer reviews" eyebrow="APPROVE OR DECLINE">
        <LoadState {...transfers} />
        {transfers.data?.transfers?.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Sender</th>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {transfers.data.transfers.map((transfer: RecordData) => (
                  <tr key={transfer.id}>
                    <td>
                      {transfer.fromUser.name}
                      <small>{transfer.fromUser.email}</small>
                    </td>
                    <td>
                      {transfer.toUser.name}
                      <small>{transfer.toUser.email}</small>
                    </td>
                    <td>{money(transfer.amount)}</td>
                    <td>
                      <Badge value={transfer.status} />
                    </td>
                    <td>
                      {transfer.status === "PENDING" ? (
                        <button
                          className="ws-button ws-button-small"
                          onClick={() => setReview(transfer)}
                        >
                          Review transfer
                        </button>
                      ) : (
                        <DateText value={transfer.reviewedAt} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !transfers.loading && !transfers.error ? (
          <Empty title="No account transfers">
            Transfers you create will appear here for review.
          </Empty>
        ) : null}
      </Panel>
      {review && (
        <Panel
          title="Review selected transfer"
          action={
            <button className="ws-text-button" onClick={() => setReview(null)}>
              Cancel review
            </button>
          }
        >
          <p className="ws-panel-description">
            {review.fromUser.name} → {review.toUser.name} ·{" "}
            {money(review.amount)}
            <br />
            Request note: {review.note}
          </p>
          <ActionForm
            key={review.id}
            path={`/admin/transfers/${encodeURIComponent(review.id)}/review`}
            submit="Save transfer decision"
            onSuccess={() => {
              setReview(null);
              void transfers.reload();
              void users.reload();
            }}
          >
            <Field label="Transfer decision" name="action">
              <select name="action">
                <option value="approve">Approve and credit recipient</option>
                <option value="reject">Decline and refund sender</option>
              </select>
            </Field>
            <FinancialProof />
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
export function AdminTransactionLog() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const query = new URLSearchParams();
  if (type) query.set("type", type);
  if (status) query.set("status", status);
  const transactions = useRemote(`/admin/transactions?${query}`);
  return (
    <Panel title="All transactions" eyebrow="PLATFORM ACTIVITY">
      <div className="ws-form-row">
        <Field label="Transaction type" name="type">
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">All types</option>
            {[
              "DEPOSIT",
              "WITHDRAWAL",
              "TRANSFER",
              "ADJUSTMENT",
              "INVESTMENT",
              "RETURN",
              "REFERRAL",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        <Field label="Transaction status" name="status">
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {[
              "PENDING",
              "APPROVED",
              "REJECTED",
              "PAID",
              "ACTIVE",
              "SETTLED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
      </div>
      <LoadState {...transactions} />
      {transactions.data?.transactions?.length ? (
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Investor</th>
                <th>Transaction</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {transactions.data.transactions.map((transaction: RecordData) => {
                const path = (
                  {
                    DEPOSIT: "deposits",
                    WITHDRAWAL: "withdrawals",
                    TRANSFER: "transfers",
                  } as Record<string, string>
                )[transaction.type];
                return (
                  <tr key={transaction.id}>
                    <td>
                      {transaction.user.name}
                      <small>{transaction.user.email}</small>
                    </td>
                    <td>
                      {transaction.type}
                      <small>{transaction.note}</small>
                      <DateText value={transaction.createdAt} />
                    </td>
                    <td>
                      {transaction.direction === "DEBIT"
                        ? "−"
                        : transaction.direction === "CREDIT"
                          ? "+"
                          : ""}
                      {money(transaction.amount)}
                    </td>
                    <td>
                      <Badge value={transaction.status} />
                    </td>
                    <td>
                      {path &&
                      ["PENDING", "APPROVED"].includes(transaction.status) ? (
                        <a
                          className="ws-button ws-button-small"
                          href={`/admin/${path}`}
                        >
                          Review
                        </a>
                      ) : (
                        "Recorded"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !transactions.loading && !transactions.error ? (
        <Empty title="No matching transactions">
          Recorded transactions will appear here.
        </Empty>
      ) : null}
    </Panel>
  );
}
