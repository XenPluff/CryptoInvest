"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  FileCheck2,
  LockKeyhole,
  Plus,
  Search,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api, money } from "@/lib/api";
import { ContentOperations, CampaignOperations } from "./ContentOperations";
import { AdminAnalytics } from "./AdminAnalytics";
import { ProviderConnections } from "./ProviderConnections";
import { Operations } from "./Operations";
import {
  BalanceManagement,
  TransferManagement,
  AdminTransactionLog,
} from "./AdminFunds";
import {
  ActionForm,
  Badge,
  DateText,
  Empty,
  Field,
  LoadState,
  Notice,
  Panel,
  RecordData,
  TransactionsTable,
  useModalFocus,
  useRemote,
} from "./shared";

export function AdminContent({ section }: { section: string }) {
  if (!section) return <AdminOverview />;
  if (section === "users") return <AdminUsers />;
  if (section === "balances") return <BalanceManagement />;
  if (section === "transfers") return <TransferManagement />;
  if (section === "transactions") return <AdminTransactionLog />;
  if (section === "plans") return <AdminPlans />;
  if (section === "investments") return <InvestmentSettlements />;
  if (section === "deposits" || section === "withdrawals")
    return <FinancialReviews type={section} />;
  if (section === "kyc") return <KycReviews />;
  if (section === "audit") return <AuditLogs />;
  if (section === "operations") return <Operations />;
  if (section === "messages") return <Messages />;
  if (section === "settings") return <PlatformSettings />;
  if (section === "content") return <ContentOperations />;
  if (section === "campaigns") return <CampaignOperations />;
  return (
    <Empty title="Page not found">Choose a section from your navigation.</Empty>
  );
}
function AdminOverview() {
  const r = useRemote("/admin/overview");
  if (r.loading || r.error) return <LoadState {...r} />;
  const d = r.data!;
  return (
    <>
      <div className="ws-stats-grid">
        {[
          ["Total accounts", d.totalUsers, "Registered accounts"],
          ["Active investors", d.activeInvestors, "With active positions"],
          [
            "Verified deposits",
            money(d.totalDeposits || 0),
            "Approved deposit value",
          ],
          [
            "Completed withdrawals",
            money(d.totalWithdrawals || 0),
            "Paid withdrawal value",
          ],
        ].map(([label, value, note]) => (
          <div className="ws-stat-card" key={label}>
            <span className="ws-stat-top">
              {label}
              <Users size={17} />
            </span>
            <strong>{value}</strong>
            <span className="ws-stat-note">{note}</span>
          </div>
        ))}
      </div>
      <AdminAnalytics />
      <div className="ws-review-counts">
        {[
          ["deposits", d.pendingDeposits, "Deposit reviews", Wallet],
          [
            "withdrawals",
            d.pendingWithdrawals,
            "Withdrawal reviews",
            ArrowUpRight,
          ],
          ["kyc", d.pendingKyc, "Identity reviews", FileCheck2],
        ].map(([route, count, label, Icon]: any) => (
          <a className="ws-review-count" href={`/admin/${route}`} key={route}>
            <Icon size={22} />
            <div>
              <strong>{count || 0}</strong>
              <span>{label}</span>
            </div>
            <ArrowUpRight size={18} />
          </a>
        ))}
      </div>
      <div className="ws-two-column">
        <Panel title="Recent account activity" eyebrow="PLATFORM OVERVIEW">
          <TransactionsTable rows={d.transactions || []} />
        </Panel>
        <Panel title="Operator activity" eyebrow="AUDIT TRAIL">
          <LogList rows={d.auditLogs?.slice(0, 5) || []} />
        </Panel>
      </div>
      <Notice>
        Financial approvals require your authenticator code and an evidence
        note. Only approve funds you have independently verified.
      </Notice>
    </>
  );
}
function AdminUsers() {
  const r = useRemote("/admin/users");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecordData | null>(null);
  const rows =
    r.data?.users?.filter((u: RecordData) =>
      `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <Panel
        title="Investor directory"
        action={
          <div className="ws-search">
            <Search size={16} />
            <input
              aria-label="Search investors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
            />
          </div>
        }
      >
        <LoadState {...r} />
        {rows.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Joined</th>
                  <th>Identity</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((u: RecordData) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </td>
                    <td>
                      <DateText value={u.createdAt} />
                    </td>
                    <td>
                      <Badge
                        value={u.kycStatus || u.kyc?.status || "not_submitted"}
                      />
                    </td>
                    <td>
                      <Badge
                        value={u.suspended ? "suspended" : u.role || "active"}
                      />
                    </td>
                    <td>
                      <button
                        className="ws-button ws-button-small"
                        onClick={() => setSelected(u)}
                      >
                        Manage <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !r.loading && (
            <Empty
              icon={Users}
              title={query ? "No matching investors" : "No investors yet"}
            >
              {query
                ? "Try a different name or email address."
                : "Registered investor accounts will appear here."}
            </Empty>
          )
        )}
      </Panel>
      {selected && (
        <AdminDialog
          title={`Manage ${selected.name}`}
          onClose={() => setSelected(null)}
        >
          <ActionForm
            path={`/admin/users/${selected.id}`}
            method="PATCH"
            submit="Save investor account"
            transform={(d) => ({
              name: d.name,
              suspended: d.suspended === "true",
            })}
            onSuccess={() => {
              void r.reload();
              setSelected(null);
            }}
          >
            <Field
              label="Full name"
              name="name"
              required
              defaultValue={selected.name}
            />
            <Field label="Account access" name="suspended">
              <select
                name="suspended"
                defaultValue={String(!!selected.suspended)}
              >
                <option value="false">Active</option>
                <option value="true">Suspended</option>
              </select>
            </Field>
            <Notice>
              Suspension prevents this investor from signing in or performing
              financial actions. All changes are recorded in the audit trail.
            </Notice>
          </ActionForm>
        </AdminDialog>
      )}
    </>
  );
}
function AdminPlans() {
  const r = useRemote("/admin/plans");
  const [selected, setSelected] = useState<RecordData | null>(null);
  return (
    <>
      <Panel
        title="Investment plan configuration"
        action={
          <button
            className="ws-button ws-button-gold ws-button-small"
            onClick={() => setSelected({})}
          >
            <Plus size={15} /> New plan
          </button>
        }
      >
        <LoadState {...r} />
        {r.data?.plans?.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Rate</th>
                  <th>Range</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {r.data.plans.map((p: RecordData) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small>{p.slug}</small>
                    </td>
                    <td>
                      {((p.dailyRate || p.monthlyRate) * 100).toFixed(2)}% /{" "}
                      {p.monthlyRate ? "month" : "day"}
                    </td>
                    <td>
                      {money(p.minAmount)} – {money(p.maxAmount)}
                    </td>
                    <td>{p.durationDays} days</td>
                    <td>
                      <Badge value={p.active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <button
                        className="ws-button ws-button-small"
                        onClick={() => setSelected(p)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !r.loading && (
            <Empty title="No investment plans">
              Create an investment plan with clear rates and subscription terms.
            </Empty>
          )
        )}
      </Panel>
      <Notice>
        Plan changes affect future investments. Existing positions retain their
        rate and duration snapshots. Enter rates as a fraction: 0.025 means
        2.5%.
      </Notice>
      {selected && (
        <AdminDialog
          title={
            selected.id ? `Edit ${selected.name}` : "Create an investment plan"
          }
          onClose={() => setSelected(null)}
        >
          <ActionForm
            path={selected.id ? `/admin/plans/${selected.id}` : "/admin/plans"}
            method={selected.id ? "PATCH" : "POST"}
            submit="Save investment plan"
            transform={(d) => ({
              ...d,
              dailyRate: d.dailyRate ? Number(d.dailyRate) : 0,
              monthlyRate: d.monthlyRate ? Number(d.monthlyRate) : 0,
              minAmount: Number(d.minAmount),
              maxAmount: Number(d.maxAmount),
              durationDays: Number(d.durationDays),
              active: d.active === "true",
            })}
            onSuccess={() => {
              void r.reload();
              setSelected(null);
            }}
          >
            <div className="ws-form-row">
              <Field
                label="Plan name"
                name="name"
                required
                defaultValue={selected.name}
              />
              <Field
                label="URL slug"
                name="slug"
                required
                defaultValue={selected.slug}
              />
            </div>
            <Field
              label="Description"
              name="description"
              defaultValue={selected.description}
            />
            <div className="ws-form-row">
              <Field
                label="Daily rate (fraction)"
                name="dailyRate"
                type="number"
                step="0.0001"
                min="0"
                defaultValue={selected.dailyRate ?? ""}
              />
              <Field
                label="Monthly rate (fraction)"
                name="monthlyRate"
                type="number"
                step="0.0001"
                min="0"
                defaultValue={selected.monthlyRate ?? ""}
              />
            </div>
            <div className="ws-form-row">
              <Field
                label="Minimum amount (USD)"
                name="minAmount"
                required
                type="number"
                min="0"
                step="0.01"
                defaultValue={selected.minAmount}
              />
              <Field
                label="Maximum amount (USD)"
                name="maxAmount"
                required
                type="number"
                min="0"
                step="0.01"
                defaultValue={selected.maxAmount}
              />
            </div>
            <div className="ws-form-row">
              <Field
                label="Duration (days)"
                name="durationDays"
                required
                type="number"
                min="1"
                defaultValue={selected.durationDays || 30}
              />
              <Field label="Availability" name="active">
                <select
                  name="active"
                  defaultValue={String(selected.active ?? true)}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            </div>
          </ActionForm>
        </AdminDialog>
      )}
    </>
  );
}
function FinancialReviews({ type }: { type: "deposits" | "withdrawals" }) {
  const r = useRemote(`/admin/${type}`);
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [filter, setFilter] = useState("pending");
  const isDeposit = type === "deposits";
  const rows =
    r.data?.[type]?.filter(
      (t: RecordData) =>
        filter === "all" || String(t.status).toLowerCase() === filter,
    ) || [];
  return (
    <>
      <Notice>
        {isDeposit
          ? "Verify the receiving network, transaction hash, confirmation count, and actual amount before approving a deposit."
          : "Verify the recipient address and available balance before approving. Mark a withdrawal paid only after sending funds and recording its transaction hash."}
      </Notice>
      <Panel
        title={
          isDeposit ? "Deposit verification queue" : "Withdrawal review queue"
        }
        action={
          <select
            className="ws-filter-select"
            aria-label="Filter review status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["pending", "approved", "rejected", "paid", "all"].map((v) => (
              <option key={v} value={v}>
                {v === "all"
                  ? "All statuses"
                  : v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        }
      >
        <LoadState {...r} />
        {rows.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Amount</th>
                  <th>Asset / network</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((t: RecordData) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.user?.name || "Investor"}</strong>
                      <small>{t.user?.email || t.userId}</small>
                    </td>
                    <td className="ws-tabular">{money(t.amount)}</td>
                    <td>
                      {t.asset}
                      <small>{t.network}</small>
                    </td>
                    <td>
                      <DateText value={t.createdAt} />
                    </td>
                    <td>
                      <Badge value={t.status} />
                    </td>
                    <td>
                      <button
                        className="ws-button ws-button-small"
                        onClick={() => setSelected(t)}
                      >
                        Review <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !r.loading && (
            <Empty icon={Check} title="The queue is clear">
              There are no {filter === "all" ? "" : filter} {type} to display.
            </Empty>
          )
        )}
      </Panel>
      {selected && (
        <AdminDialog
          title={isDeposit ? "Review deposit" : "Review withdrawal"}
          onClose={() => setSelected(null)}
        >
          <div className="ws-review-summary">
            <div>
              <span>Investor</span>
              <strong>{selected.user?.name}</strong>
              <small>{selected.user?.email}</small>
            </div>
            <div>
              <span>Requested amount</span>
              <strong>{money(selected.amount)}</strong>
            </div>
            <div>
              <span>Asset and network</span>
              <strong>
                {selected.asset} · {selected.network}
              </strong>
            </div>
            <div>
              <span>
                {isDeposit
                  ? "Submitted transaction hash"
                  : "Destination address"}
              </span>
              <code>{isDeposit ? selected.txHash : selected.address}</code>
            </div>
            {isDeposit && selected.wallet && (
              <div>
                <span>Receiving address</span>
                <code>{selected.wallet.address}</code>
              </div>
            )}
          </div>
          <ActionForm
            path={`/admin/${type}/${selected.id}/review`}
            submit="Record review decision"
            transform={(d) => {
              const {
                txHash,
                ownershipEvidence,
                verificationReference,
                ...rest
              } = d;
              return {
                ...rest,
                ...(txHash ? { txHash } : {}),
                ...(ownershipEvidence ? { ownershipEvidence } : {}),
                ...(verificationReference ? { verificationReference } : {}),
                ...(d.confirmedAmount
                  ? { confirmedAmount: Number(d.confirmedAmount) }
                  : {}),
              };
            }}
            onSuccess={() => {
              void r.reload();
              setSelected(null);
            }}
          >
            <Field label="Decision" name="action">
              <select name="action" required>
                <option value="approve">Approve</option>
                <option value="reject">Decline</option>
                {!isDeposit && (
                  <option value="paid">Mark paid — funds sent</option>
                )}
              </select>
            </Field>
            {isDeposit ? (
              <Field
                label="Confirmed amount (USD)"
                name="confirmedAmount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={selected.amount}
                help="Enter the independently verified transaction value."
              />
            ) : (
              <Field
                label="Settlement transaction hash"
                name="txHash"
                placeholder="Required when marking paid"
              />
            )}
            {isDeposit && (
              <>
                <Field
                  label="Independent on-chain evidence reference"
                  name="verificationReference"
                  placeholder="Explorer URL or confirmed transaction record"
                />
                <Field
                  label="Depositor ownership and source-of-funds evidence"
                  name="ownershipEvidence"
                >
                  <textarea
                    name="ownershipEvidence"
                    minLength={20}
                    rows={3}
                    placeholder="Record independently verified depositor attribution. A public transaction hash alone does not establish ownership."
                  />
                </Field>
              </>
            )}
            <Field label="Evidence and review note" name="note">
              <textarea
                name="note"
                required
                minLength={15}
                rows={3}
                placeholder={
                  isDeposit
                    ? "Record explorer evidence, confirmations, and verified amount."
                    : "Record checks performed and settlement details."
                }
              />
            </Field>
            <Field
              label="Operator authenticator code"
              name="code"
              required
              placeholder="6-digit code"
            />
          </ActionForm>
        </AdminDialog>
      )}
    </>
  );
}
function KycReviews() {
  const r = useRemote("/admin/kyc");
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [filter, setFilter] = useState("pending");
  const rows =
    r.data?.submissions?.filter(
      (k: RecordData) =>
        filter === "all" || String(k.status).toLowerCase() === filter,
    ) || [];
  return (
    <>
      <Notice>
        This queue contains submitted identity metadata for manual operator
        review. A document verification provider is not connected. Do not
        represent metadata approval as independent document authentication.
      </Notice>
      <Panel
        title="Identity review queue"
        action={
          <select
            className="ws-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter identity status"
          >
            <option value="pending">Pending reviews</option>
            <option value="all">All submissions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        }
      >
        <LoadState {...r} />
        {rows.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Country</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((k: RecordData) => (
                  <tr key={k.id}>
                    <td>
                      <strong>{k.fullName}</strong>
                      <small>{k.user?.email}</small>
                    </td>
                    <td>{k.country}</td>
                    <td>
                      <DateText value={k.createdAt} />
                    </td>
                    <td>
                      <Badge value={k.status} />
                    </td>
                    <td>
                      <button
                        className="ws-button ws-button-small"
                        onClick={() => setSelected(k)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !r.loading && (
            <Empty icon={FileCheck2} title="No identity submissions to review">
              Submitted verification details will appear here.
            </Empty>
          )
        )}
      </Panel>
      {selected && (
        <AdminDialog
          title={`Identity review · ${selected.fullName}`}
          onClose={() => setSelected(null)}
        >
          <div className="ws-review-summary">
            {[
              ["Full name", selected.fullName],
              ["Email", selected.user?.email],
              ["Country", selected.country],
              ["Date of birth", selected.dateOfBirth],
              ["Document type", selected.documentType],
              ["Document number", selected.documentNumber],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <ActionForm
            path={`/admin/kyc/${selected.id}/review`}
            submit="Record identity review"
            onSuccess={() => {
              void r.reload();
              setSelected(null);
            }}
          >
            <Field label="Decision" name="action">
              <select name="action">
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
              </select>
            </Field>
            <Field label="Review note" name="note">
              <textarea
                name="note"
                required
                minLength={10}
                rows={3}
                placeholder="Record your review and the reason for the decision."
              />
            </Field>
            <Field
              label="Operator authenticator code"
              name="code"
              required
              placeholder="6-digit code"
            />
          </ActionForm>
        </AdminDialog>
      )}
    </>
  );
}
function LogList({ rows }: { rows: RecordData[] }) {
  return rows.length ? (
    <div className="ws-log-list">
      {rows.map((log) => (
        <div className="ws-log-item" key={log.id}>
          <span className="ws-log-dot" />
          <div>
            <strong>
              {String(log.action || log.type || "Account event").replaceAll(
                "_",
                " ",
              )}
            </strong>
            <p>
              {log.actor?.email || log.user?.email || log.actorId || "System"}
              {log.entityType ? ` · ${log.entityType}` : ""}
            </p>
            {(log.note || log.metadata?.note) && (
              <p>{log.note || log.metadata.note}</p>
            )}
            {log.targetId && (
              <p className="ws-mono">Reference {log.targetId}</p>
            )}
            <small>
              <DateText value={log.createdAt} />{" "}
              {log.createdAt &&
                new Date(log.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </small>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty icon={Shield} title="No audit events yet">
      Administrative decisions and account events are recorded here.
    </Empty>
  );
}
function AuditLogs() {
  const r = useRemote("/admin/audit");
  return (
    <Panel title="Platform audit trail" eyebrow="ACCOUNTABILITY BY DESIGN">
      <p className="ws-panel-description">
        Administrative actions are recorded with their actor, timestamp, and
        review context.
      </p>
      <LoadState {...r} />
      {r.data && <LogList rows={r.data.logs || []} />}
    </Panel>
  );
}
function Messages() {
  const r = useRemote("/admin/messages");
  const [selected, setSelected] = useState<RecordData | null>(null);
  return (
    <>
      <Panel title="Contact requests" eyebrow="YOUR INBOX">
        <LoadState {...r} />
        {r.data?.messages?.length ? (
          <div className="ws-message-list">
            {r.data.messages.map((m: RecordData) => (
              <button
                className="ws-message"
                key={m.id}
                onClick={() => setSelected(m)}
              >
                <div className="ws-avatar">{m.name?.slice(0, 1) || "?"}</div>
                <div>
                  <strong>{m.subject}</strong>
                  <p>
                    {m.name} · {m.email}
                  </p>
                  <span>{m.message}</span>
                </div>
                <small>
                  <DateText value={m.createdAt} />
                </small>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          !r.loading && (
            <Empty title="Your inbox is clear">
              Messages sent through the public contact form will appear here.
            </Empty>
          )
        )}
      </Panel>
      {selected && (
        <AdminDialog title={selected.subject} onClose={() => setSelected(null)}>
          <p className="ws-muted">
            {selected.name} · {selected.email} ·{" "}
            <DateText value={selected.createdAt} />
          </p>
          <p className="ws-message-body">{selected.message}</p>
          <a
            className="ws-button ws-button-gold"
            href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}
          >
            Reply by email <ArrowUpRight size={16} />
          </a>
        </AdminDialog>
      )}
    </>
  );
}
function PlatformSettings() {
  const r = useRemote("/admin/settings");
  return (
    <div className="ws-two-column">
      <Panel title="Financial activation" eyebrow="PLATFORM CONTROLS">
        <LoadState {...r} />
        {r.data && (
          <>
            <div className="ws-inline-status">
              <span>Funding status</span>
              <Badge value={r.data.fundingEnabled ? "enabled" : "disabled"} />
            </div>
            <p className="ws-panel-description">
              Activate only after receiving wallets are configured, operator
              review procedures are ready, and the platform is legally
              authorized to accept funds.
            </p>
            <ActionForm
              path="/admin/settings"
              method="PATCH"
              submit="Update funding availability"
              transform={(d) => ({
                fundingEnabled: d.fundingEnabled === "true",
                code: d.code,
              })}
              onSuccess={() => void r.reload()}
            >
              <Field label="Funding availability" name="fundingEnabled">
                <select
                  name="fundingEnabled"
                  defaultValue={String(r.data.fundingEnabled)}
                >
                  <option value="false">
                    Disabled — prevent financial submissions
                  </option>
                  <option value="true">
                    Enabled — accept financial submissions
                  </option>
                </select>
              </Field>
              <Field
                label="Operator authenticator code"
                name="code"
                required
                placeholder="6-digit code"
              />
              <label className="ws-checkbox">
                <input type="checkbox" required /> I have reviewed the platform
                readiness and authorize this configuration change.
              </label>
            </ActionForm>
          </>
        )}
      </Panel>
      <div>
        <ProviderConnections />
        <Panel title="Service connections" eyebrow="OPERATIONAL READINESS">
          <div className="ws-inline-status">
            <span>Email delivery</span>
            <Badge
              value={r.data?.emailConfigured ? "configured" : "not_configured"}
            />
          </div>
          <p className="ws-panel-description">
            Email credentials are configured through secure environment
            settings. Deposit destinations use the supplied wallet addresses
            stored in the database and displayed above.
          </p>
          <Notice>
            Market data is read from the configured provider. Cryptocurrency
            transfers and identity review are manual operations until dedicated
            providers are integrated.
          </Notice>
        </Panel>
        <Panel title="Operator security">
          <p className="ws-panel-description">
            Configure your own authenticator from account security before
            approving any financial actions.
          </p>
          <a className="ws-button" href="/dashboard/account">
            Open account security <ArrowUpRight size={16} />
          </a>
        </Panel>
      </div>
    </div>
  );
}
function AdminDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useModalFocus(onClose);
  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <section
        className="ws-modal ws-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="ws-modal-close"
          aria-label="Close review"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="ws-eyebrow">OPERATOR WORKSPACE</span>
        <h2 id="admin-dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

function InvestmentSettlements() {
  const r = useRemote("/admin/investments");
  const [selected, setSelected] = useState<RecordData | null>(null);
  return (
    <>
      <Notice>
        Settle an investment only after independently establishing its realized
        result. Projected counters never authorize wallet credits. Settlement
        requires an evidence reference and is recorded in the ledger.
      </Notice>
      <Panel title="Investment settlement ledger">
        <LoadState {...r} />
        {r.data?.investments?.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Investor / plan</th>
                  <th>Principal</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {r.data.investments.map((i: RecordData) => (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.user?.name || i.userId}</strong>
                      <small>{i.planName || i.plan?.name}</small>
                    </td>
                    <td>{money(i.principalAmount)}</td>
                    <td>
                      <DateText value={i.startTimestamp} />
                    </td>
                    <td>
                      <Badge value={i.status} />
                    </td>
                    <td>
                      <button
                        className="ws-button ws-button-small"
                        disabled={String(i.status).toLowerCase() !== "active"}
                        onClick={() => setSelected(i)}
                      >
                        Settle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !r.loading && (
            <Empty title="No investments to settle">
              Actual investment positions will appear here when investors
              subscribe.
            </Empty>
          )
        )}
      </Panel>
      {selected && (
        <AdminDialog
          title={`Settle ${selected.planName || selected.plan?.name || "investment"}`}
          onClose={() => setSelected(null)}
        >
          <p className="ws-muted">
            Original principal: {money(selected.principalAmount)}. Enter only
            verified amounts backed by an external evidence record.
          </p>
          <ActionForm
            path={`/admin/investments/${selected.id}/settle`}
            submit="Record final settlement"
            transform={(d) => ({
              ...d,
              principalReturned: Number(d.principalReturned),
              realizedEarnings: Number(d.realizedEarnings),
            })}
            onSuccess={() => {
              void r.reload();
              setSelected(null);
            }}
          >
            <div className="ws-form-row">
              <Field
                label="Principal returned (USD)"
                name="principalReturned"
                required
                type="number"
                step="0.01"
                min="0"
                max={selected.principalAmount}
                defaultValue={selected.principalAmount}
              />
              <Field
                label="Realized earnings (USD)"
                name="realizedEarnings"
                required
                type="number"
                step="0.01"
                min="0"
                defaultValue={0}
              />
            </div>
            <Field
              label="External evidence reference"
              name="externalReference"
              required
              placeholder="Verified settlement or trade record reference"
            />
            <Field label="Settlement evidence and reasoning" name="note">
              <textarea
                name="note"
                required
                minLength={30}
                rows={4}
                placeholder="Explain how these realized amounts were verified, including the evidence source and any principal loss."
              />
            </Field>
            <Field
              label="Operator authenticator code"
              name="code"
              required
              placeholder="6-digit code"
            />
            <label className="ws-checkbox">
              <input type="checkbox" required /> I confirm these amounts are
              realized and independently verified. I understand this action
              credits the investor’s available balance.
            </label>
          </ActionForm>
        </AdminDialog>
      )}
    </>
  );
}
