"use client";
import TranslatedContent, { Verbatim } from "@/components/TranslatedContent";
import { useDisplayLocale, displayLocale } from "@/lib/i18n";
import Link from "next/link";
import LanguageSelector from "@/components/LanguageSelector";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileCheck2,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  Search,
  Settings2,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { api, money } from "@/lib/api";
import {
  ActionForm,
  Badge,
  CopyButton,
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
import { AdminContent } from "./admin";
import { LiveInvestmentDisplay } from "@/components/LiveInvestmentDisplay";
import { WalletConnections } from "./WalletConnections";
import { PasskeySettings } from "./PasskeySettings";
import { TwoFactorSettings } from "./TwoFactorSettings";
import { PortfolioAnalytics } from "./PortfolioAnalytics";
import { DepositWorkspace } from "./DepositWorkspace";
import { InvestorCards } from "./Cards";

const investorNav = [
  { id: "", name: "Overview", icon: LayoutDashboard },
  { id: "investments", name: "My investments", icon: TrendingUp },
  { id: "plans", name: "Investment plans", icon: Sparkles },
  { id: "wallets", name: "Deposit funds", icon: Wallet },
  { id: "withdrawals", name: "Withdraw funds", icon: ArrowUpRight },
  { id: "cards", name: "Cards", icon: CreditCard },
  { id: "transactions", name: "Transactions", icon: Activity },
  { id: "referrals", name: "Referrals", icon: Gift },
  { id: "account", name: "Account & security", icon: Shield },
];
const adminNav = [
  { id: "", name: "Overview", icon: LayoutDashboard },
  { id: "users", name: "Investors", icon: Users },
  { id: "balances", name: "Balances", icon: Wallet },
  { id: "transfers", name: "Account transfers", icon: ArrowLeft },
  { id: "transactions", name: "Transactions", icon: Activity },
  { id: "plans", name: "Investment plans", icon: Sparkles },
  { id: "investments", name: "Settlements", icon: TrendingUp },
  { id: "deposits", name: "Deposit reviews", icon: ArrowDownLeft },
  { id: "withdrawals", name: "Withdrawals", icon: ArrowUpRight },
  { id: "kyc", name: "Identity reviews", icon: FileCheck2 },
  { id: "cards", name: "Card applications", icon: CreditCard },
  { id: "audit", name: "Audit trail", icon: FileText },
  { id: "operations", name: "Operations & backups", icon: Shield },
  { id: "messages", name: "Messages", icon: Bell },
  { id: "content", name: "Content studio", icon: FileText },
  { id: "campaigns", name: "Email campaigns", icon: Mail },
  { id: "settings", name: "Platform settings", icon: Settings2 },
];
const titles: Record<string, [string, string]> = {
  "": [
    "Your financial future, in focus.",
    "An overview of your portfolio and account activity.",
  ],
  investments: [
    "Your portfolio. Your progress.",
    "Follow your active positions and their projected growth.",
  ],
  plans: [
    "A plan for your ambition.",
    "Explore investment plans with clear rates and defined terms.",
  ],
  wallets: [
    "Fund your next move.",
    "A considered transfer. A clear path to your portfolio.",
  ],
  withdrawals: [
    "Your capital, on your terms.",
    "Request a secure withdrawal to your external wallet.",
  ],
  transactions: [
    "Every move, accounted for.",
    "A complete record of your account activity.",
  ],
  referrals: [
    "Good connections grow together.",
    "Invite your network and track eligible referral commissions.",
  ],
  account: [
    "A little peace of mind.",
    "Manage your profile, identity verification, and account security.",
  ],
  cards: ["The AUREON card concept.", "Explore designs, apply for preliminary review and follow your application."],
};
export default function Workspace({ admin = false }: { admin?: boolean }) {
  useDisplayLocale();
  const path = usePathname();
  const router = useRouter();
  const base = admin ? "/admin" : "/dashboard";
  const section = path.replace(base, "").split("/").filter(Boolean)[0] || "";
  const nav = admin ? adminNav : investorNav;
  const auth = useRemote("/auth/me");
  const [mobile, setMobile] = useState(false);
  const [notices, setNotices] = useState(false);
  const notifications = useRemote("/notifications", Boolean(auth.data?.user && !(auth.data.user.role === "ADMIN" && !auth.data.user.twoFactorEnabled)));
  const current = nav.find((n) => n.id === section);
  const user = auth.data?.user;
  useEffect(() => {
    if (auth.status === 401)
      router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [auth.status, path, router]);
  useEffect(() => {
    setMobile(false);
  }, [path]);
  if (auth.loading)
    return <TranslatedContent>{(
      <div className="ws-auth-loading">
        <LanguageSelector />
        <span className="ws-brand">
          AUREON<span>®</span>
        </span>
        <LoadState loading error="" reload={auth.reload} />
      </div>
    )}</TranslatedContent>;
  if (auth.error)
    return <TranslatedContent>{(
      <div className="ws-auth-loading">
        <LanguageSelector />
        <LoadState loading={false} error={auth.error} reload={auth.reload} />
        <Link className="ws-button" href="/login">
          Sign in
        </Link>
      </div>
    )}</TranslatedContent>;
  if (user?.role === "ADMIN" && !user.twoFactorEnabled)
    return <TranslatedContent>{(
      <div className="ws-auth-loading">
        <LanguageSelector />
        <h1>Secure your operator account.</h1>
        <p>Complete mandatory authenticator setup before accessing account records or administration.</p>
        <TwoFactorSettings user={user} refreshUser={auth.reload} />
        <button className="ws-text-button" onClick={async()=>{await api("/auth/logout",{method:"POST"});router.replace("/login");}}>Sign out</button>
      </div>
    )}</TranslatedContent>;
  if (admin && user?.role !== "ADMIN")
    return <TranslatedContent>{(
      <div className="ws-auth-loading">
        <LanguageSelector />
        <Shield size={35} />
        <h1>Administrator access required</h1>
        <p>Your account does not have permission to view this workspace.</p>
        <Link className="ws-button" href="/dashboard">
          Return to your dashboard
        </Link>
      </div>
    )}</TranslatedContent>;
  return <TranslatedContent>{(
    <div className="ws-shell" >
      <button
        className={`ws-sidebar-scrim ${mobile ? "is-open" : ""}`}
        onClick={() => setMobile(false)}
        aria-label="Close navigation"
      />
      <aside className={`ws-sidebar ${mobile ? "is-open" : ""}`}>
        <Link className="ws-brand" href="/">
          AUREON<span>®</span>
        </Link>
        <div className="ws-workspace-label">
          <span className="ws-live-dot" />
          {admin ? "OPERATOR WORKSPACE" : "INVESTOR WORKSPACE"}
        </div>
        <nav className="ws-nav" aria-label="Workspace navigation">
          {nav.map((n, i) => (
            <Link
              key={n.id}
              aria-current={section === n.id ? "page" : undefined}
              className={`ws-nav-link ${section === n.id ? "is-active" : ""} ${i === 6 ? "ws-nav-break" : ""}`}
              href={`${base}/${n.id}`}
            >
              <n.icon size={18} strokeWidth={1.65} />
              <span>{n.name}</span>
              {section === n.id && <span className="ws-nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="ws-sidebar-bottom">
          {admin ? (
            <Link className="ws-support" href="/dashboard">
              <ArrowLeft size={18} />
              <span>Investor workspace</span>
              <ArrowUpRight size={15} />
            </Link>
          ) : (
            <Link className="ws-support" href="/support#contact">
              <CircleHelp size={18} />
              <span>Need a hand?</span>
              <ArrowUpRight size={15} />
            </Link>
          )}
          <div className="ws-user">
            <div className="ws-avatar"><Verbatim>{user?.name?.slice(0, 1) || "A"}</Verbatim></div>
            <div>
              <strong><Verbatim>{user?.name}</Verbatim></strong>
              <span>{admin ? "Administrator" : "Personal account"}</span>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" });
                router.push("/login");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="ws-main">
        <header className="ws-topbar">
          <div className="ws-breadcrumb">
            <button
              className="ws-menu-toggle"
              aria-label="Open navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>{admin ? "Administration" : "Workspace"}</span>
            <ChevronRight size={13} />
            <strong>{current?.name || "Page"}</strong>
          </div>
          <div className="ws-topbar-actions">
            <LanguageSelector />
            <span className="ws-topbar-security">
              <Shield size={13} /> Secure session
            </span>
            <button
              className={`ws-notification-button ${notices ? "is-active" : ""}`}
              aria-label="Notifications"
              aria-expanded={notices}
              onClick={() => setNotices(!notices)}
            >
              <Bell size={18} />
              {notifications.data?.notifications?.some(
                (n: RecordData) => !n.readAt,
              ) && <i />}
            </button>
            <Link
              className="ws-avatar ws-avatar-small"
              href={`${base}/${admin ? "settings" : "account"}`}
            >
              <Verbatim>{user?.name?.slice(0, 1) || "A"}</Verbatim>
            </Link>
          </div>
          {notices && (
            <div className="ws-notification-popover">
              <div className="ws-panel-header">
                <h3>Notifications</h3>
                <button
                  aria-label="Close notifications"
                  onClick={() => setNotices(false)}
                >
                  <X size={16} />
                </button>
              </div>
              {notifications.data?.notifications?.length ? (
                notifications.data.notifications.map((n: RecordData) => (
                  <div className="ws-notification-item" key={n.id}>
                    <p>{n.message || n.title}</p>
                    <small>
                      <DateText value={n.createdAt} />
                    </small>
                  </div>
                ))
              ) : (
                <p className="ws-muted">
                  You’re all caught up. Account updates will appear here.
                </p>
              )}
              {notifications.data?.notifications?.length > 0 && (
                <button
                  className="ws-text-button"
                  onClick={async () => {
                    await api("/notifications/read", { method: "POST" });
                    void notifications.reload();
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>
          )}
        </header>
        <motion.main
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="ws-content"
        >
          <div className="ws-page-heading">
            <div>
              <span className="ws-eyebrow">
                {admin ? "PLATFORM OPERATIONS" : <>WELCOME <Verbatim>{user?.name?.split(" ")[0]?.toUpperCase() || ""}</Verbatim></>}
              </span>
              <h1>
                {admin
                  ? current?.name
                  : titles[section]?.[0] || "Page not found"}
              </h1>
              <p>
                {admin
                  ? "Review account activity and manage your platform with a complete audit trail."
                  : titles[section]?.[1]}
              </p>
            </div>
            {!admin && section === "" && (
              <Link
                className="ws-button ws-button-gold"
                href="/dashboard/wallets"
              >
                <Plus size={16} /> Add funds
              </Link>
            )}
          </div>
          {admin ? (
            <AdminContent section={section} />
          ) : (
            <InvestorContent
              section={section}
              user={user}
              refreshUser={auth.reload}
            />
          )}
          <footer className="ws-footer">
            <span>
              © {new Date().getFullYear()} Aureon. All rights reserved.
            </span>
            <div>
              <Link href="/legal/terms">Terms of service</Link>
              <Link href="/legal/privacy">Privacy policy</Link>
              <Link href="/legal/risk">Risk disclosure</Link>
            </div>
          </footer>
        </motion.main>
      </div>
    </div>
  )}</TranslatedContent>;
}

function InvestorContent({
  section,
  user,
  refreshUser,
}: {
  section: string;
  user: RecordData;
  refreshUser: () => void;
}) {
  useDisplayLocale();
  if (section === "") return <TranslatedContent>{<Overview user={user} />}</TranslatedContent>;
  if (section === "plans") return <TranslatedContent>{<Plans />}</TranslatedContent>;
  if (section === "investments") return <TranslatedContent>{<Investments />}</TranslatedContent>;
  if (section === "wallets") return <TranslatedContent>{<DepositWorkspace user={user} />}</TranslatedContent>;
  if (section === "withdrawals") return <TranslatedContent>{<Withdrawals user={user} />}</TranslatedContent>;
  if (section === "cards") return <TranslatedContent>{<InvestorCards user={user} />}</TranslatedContent>;
  if (section === "transactions") return <TranslatedContent>{<Transactions />}</TranslatedContent>;
  if (section === "referrals") return <TranslatedContent>{<Referrals />}</TranslatedContent>;
  if (section === "account")
    return <TranslatedContent>{<Account user={user} refreshUser={refreshUser} />}</TranslatedContent>;
  return <TranslatedContent>{(
    <Empty title="This page could not be found">
      <Link href="/dashboard">Return to your overview</Link>
    </Empty>
  )}</TranslatedContent>;
}

function Overview({ user }: { user: RecordData }) {
  useDisplayLocale();
  const r = useRemote("/dashboard");
  const markets = useRemote("/markets");
  if (r.loading || r.error) return <TranslatedContent>{<LoadState {...r} />}</TranslatedContent>;
  const d = r.data!;
  const stats = [
    ["Available balance", d.balance, Wallet, "Ready for your next move"],
    ["Total invested", d.invested, TrendingUp, "Capital in active plans"],
    ["Realized earnings", d.totalEarned, Activity, "Accrued to your account"],
    ["Referral earnings", d.referralEarnings, Gift, "From your connections"],
  ];
  return <TranslatedContent>{(
    <>
      {!user.emailVerified || user.kycStatus !== "APPROVED" ? (
        <div className="ws-verification-banner">
          <div className="ws-verification-icon">
            <Shield size={22} />
          </div>
          <div>
            <strong>Your journey begins with a secure foundation.</strong>
            <p>
              Verify your email and identity to unlock investment and withdrawal
              features.
            </p>
          </div>
          <Link href="/dashboard/account" className="ws-button ws-button-small">
            Complete verification <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : null}
      <div className="ws-stats-grid">
        {stats.map(([label, value, Icon, note], i) => (
          <div
            className={`ws-stat-card ${i === 0 ? "ws-stat-featured" : ""}`}
            key={String(label)}
          >
            <div className="ws-stat-top">
              <span>{String(label)}</span>
              <span className="ws-stat-icon">
                {typeof Icon !== "number" && <Icon size={17} />}
              </span>
            </div>
            <strong>{money(Number(value || 0))}</strong>
            <span className="ws-stat-note">{String(note)}</span>
            {i === 0 && <span className="ws-stat-decoration" />}
          </div>
        ))}
      </div>
      <div className="ws-overview-grid">
        <Panel
          title="Portfolio activity"
          eyebrow="THE BIG PICTURE"
          action={<span className="ws-pill">Lifetime</span>}
        >
          <PortfolioAnalytics />
        </Panel>
        <Panel
          title="Your next move"
          eyebrow="MAKE IT COUNT"
          className="ws-next-move"
        >
          <div className="ws-gold-orbit">
            <span>✦</span>
          </div>
          <h3>
            Give your capital
            <br />
            <em>a new perspective.</em>
          </h3>
          <p>
            Find a plan that fits your goals. Understand the terms, the
            timeline, and the risks.
          </p>
          <Link className="ws-button ws-button-gold" href="/dashboard/plans">
            Discover our plans <ArrowUpRight size={15} />
          </Link>
          <div className="ws-risk-note">
            <Shield size={12} /> All investments involve risk.
          </div>
        </Panel>
      </div>
      <div className="ws-overview-grid ws-overview-grid-bottom">
        <Panel
          title="Recent transactions"
          eyebrow="YOUR ACTIVITY"
          action={
            <Link className="ws-text-button" href="/dashboard/transactions">
              View all <ArrowUpRight size={15} />
            </Link>
          }
        >
          <TransactionsTable rows={d.transactions?.slice(0, 4) || []} />
        </Panel>
        <Panel
          title="Market watch"
          eyebrow="THE CRYPTO PULSE"
          action={<span className="ws-live-dot" />}
        >
          {markets.loading ? (
            <LoadState {...markets} />
          ) : markets.error ? (
            <div className="ws-market-unavailable">
              <Activity size={24} />
              <p>Live market data is currently unavailable.</p>
              <button className="ws-text-button" onClick={markets.reload}>
                Refresh prices
              </button>
            </div>
          ) : (
            <>
              <div className="ws-market-list">
                {markets.data?.assets
                  ?.slice(0, 4)
                  .map((asset: RecordData, i: number) => (
                    <div className="ws-market-row" key={asset.id}>
                      <span
                        className={`ws-coin ws-coin-${asset.symbol.toLowerCase()}`}
                      >
                        {asset.symbol === "BTC"
                          ? "₿"
                          : asset.symbol === "ETH"
                            ? "Ξ"
                            : asset.symbol?.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{asset.name}</strong>
                        <span>{asset.symbol}</span>
                      </div>
                      <div className="ws-market-price">
                        <strong>{money(asset.price)}</strong>
                        <span
                          className={
                            asset.change24h >= 0 ? "ws-positive" : "ws-negative"
                          }
                        >
                          {asset.change24h >= 0 ? "+" : ""}
                          {Number(asset.change24h).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="ws-market-source">
                {markets.data?.stale ? "Last available prices" : "Live prices"}{" "}
                · {markets.data?.source} · 24h change
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  )}</TranslatedContent>;
}

function Plans() {
  useDisplayLocale();
  const r = useRemote("/plans");
  const health = useRemote("/health");
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [done, setDone] = useState(false);
  useModalFocus(selected ? () => setSelected(null) : undefined);
  return <TranslatedContent>{(
    <>
      <LoadState {...r} />
      {health.data && !health.data.fundingEnabled && (
        <Notice>
          Plan subscriptions open after the platform operator activates funding.
          You can review the available terms below.
        </Notice>
      )}
      <div className="ws-plans-grid">
        {r.data?.plans?.map((p: RecordData, i: number) => (
          <Panel
            key={p.id}
            className={`ws-plan-card ${i === 2 ? "ws-plan-featured" : ""}`}
          >
            <div className="ws-plan-head">
              <span className="ws-plan-number">0{i + 1}</span>
              <Sparkles size={24} strokeWidth={1} />
            </div>
            <h2><Verbatim>{p.name}</Verbatim></h2>
            <p>{p.description}</p>
            <div className="ws-plan-rate">
              <strong>
                {(Number(p.dailyRate || p.monthlyRate) * 100).toLocaleString(displayLocale(),
                  { maximumFractionDigits: 2 },
                )}
                %
              </strong>
              <span>projected / {p.monthlyRate ? "month" : "day"}</span>
            </div>
            <div className="ws-plan-detail">
              <span>Investment range</span>
              <strong>
                {money(p.minAmount)} – {money(p.maxAmount)}
              </strong>
            </div>
            <div className="ws-plan-detail">
              <span>Investment term</span>
              <strong>{p.durationDays} days</strong>
            </div>
            <button
              className="ws-button"
              disabled={!health.data?.fundingEnabled}
              onClick={() => {
                setSelected(p);
                setDone(false);
              }}
            >
              Choose <Verbatim>{p.name}</Verbatim> <ArrowUpRight size={16} />
            </button>
          </Panel>
        ))}
      </div>
      <p className="ws-disclaimer">
        Rates describe plan projections, not guaranteed returns. Digital asset
        investments may lose value. Review our{" "}
        <Link href="/legal/risk">risk disclosure</Link> before committing funds.
      </p>
      {selected && (
        <div className="ws-modal-backdrop" onClick={() => setSelected(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="invest-title"
            className="ws-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="ws-modal-close"
              aria-label="Close investment dialog"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
            <span className="ws-eyebrow">YOUR NEXT CHAPTER</span>
            <h2 id="invest-title">Invest with <Verbatim>{selected.name}</Verbatim>.</h2>
            <p>
              Investments use your available account balance. Identity approval
              and verified email are required.
            </p>
            {done ? (
              <Notice tone="success">
                Your investment has been created.{" "}
                <Link href="/dashboard/investments">View your investments</Link>
              </Notice>
            ) : (
              <ActionForm
                path="/investments"
                submit="Confirm investment"
                transform={(d) => ({
                  ...d,
                  planId: selected.id,
                  amount: Number(d.amount),
                })}
                onSuccess={() => setDone(true)}
              >
                <Field
                  label="Investment amount (USD)"
                  name="amount"
                  type="number"
                  required
                  min={selected.minAmount}
                  max={selected.maxAmount}
                  step="0.01"
                  placeholder={String(selected.minAmount)}
                />
                <label className="ws-checkbox">
                  <input type="checkbox" required /> I have reviewed the plan
                  terms and understand the investment risks.
                </label>
              </ActionForm>
            )}
          </section>
        </div>
      )}
    </>
  )}</TranslatedContent>;
}
function Investments() {
  useDisplayLocale();
  const r = useRemote("/investments");
  return <TranslatedContent>{(
    <>
      <LoadState {...r} />
      {r.data?.investments?.length ? (
        <div className="ws-investments-grid">
          {r.data.investments.map((investment: RecordData) => (
            <Panel
              key={investment.id}
              title={`${investment.planName} plan`}
              action={<Badge value={investment.status} />}
            >
              <LiveInvestmentDisplay
                planType={investment.planSlug}
                principalAmount={investment.principalAmount}
                startTimestamp={investment.startTimestamp}
                dailyRate={investment.dailyRate}
                monthlyRate={investment.monthlyRate}
                durationDays={investment.durationDays}
              />
              <div className="ws-investment-realized">
                <span>Realized earnings</span>
                <strong>{money(investment.earnedAmount || 0)}</strong>
              </div>
              <small className="ws-muted">
                Investment {investment.id} · Started{" "}
                <DateText value={investment.startTimestamp} />
              </small>
            </Panel>
          ))}
        </div>
      ) : (
        !r.loading &&
        !r.error && (
          <Panel>
            <Empty title="Your investment story starts here">
              Choose a plan to begin building your portfolio.
              <br />
              <Link
                href="/dashboard/plans"
                className="ws-button ws-button-gold"
              >
                Explore plans <ArrowUpRight size={15} />
              </Link>
            </Empty>
          </Panel>
        )
      )}
    </>
  )}</TranslatedContent>;
}
function Withdrawals({user}: {user: RecordData}) {
  useDisplayLocale();
  const r = useRemote("/dashboard");
  const health = useRemote("/wallets");
  return <TranslatedContent>{(
    <div className="ws-two-column">
      <Panel title="Request a withdrawal" eyebrow="MOVE WITH CONFIDENCE">
        {health.data && !health.data.fundingEnabled && (
          <Notice>
            Withdrawals are currently unavailable while platform funding is
            disabled.
          </Notice>
        )}
        <ActionForm
          path="/withdrawals"
          submit="Request withdrawal"
          disabled={
            !health.data?.fundingEnabled || !health.data?.wallets?.length
          }
          transform={(d) => {
            const wallet = health.data?.wallets?.find(
              (w: RecordData) => w.id === d.wallet,
            );
            return {
              ...d,
              amount: Number(d.amount),
              asset: wallet?.asset,
              network: wallet?.network,
            };
          }}
          onSuccess={() => void r.reload()}
        >
          <Field
            label="Amount (USD)"
            name="amount"
            required
            type="number"
            min="0.01"
            step="0.01"
            max={r.data?.balance}
            placeholder="0.00"
          />
          <Field label="Cryptocurrency and network" name="wallet" required>
            <select name="wallet" required>
              <option value="">Select a supported network</option>
              {health.data?.wallets?.map((w: RecordData) => (
                <option key={w.id} value={w.id}>
                  {w.asset} · {w.network}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Destination wallet address"
            name="address"
            required
            placeholder="Enter your external wallet address"
          />
          {user.twoFactorEnabled && <Field
            label="Authenticator code"
            name="code"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            help="Enter your code to confirm this withdrawal because two-factor protection is enabled on your account."
          />}
          <label className="ws-checkbox">
            <input type="checkbox" required /> I confirm the asset, network, and
            wallet address are correct.
          </label>
        </ActionForm>
      </Panel>
      <div>
        <Panel className="ws-balance-panel">
          <Wallet size={26} />
          <span className="ws-eyebrow">AVAILABLE TO WITHDRAW</span>
          <strong>{r.data ? money(r.data.balance) : "—"}</strong>
          <p>
            Pending withdrawals are reserved from your balance until the request
            is reviewed.
          </p>
        </Panel>
        <Panel title="Before you continue">
          <ul className="ws-check-list">
            <li>
              <Shield size={16} /> Your identity and email must be verified.
            </li>
            <li>
              <FileCheck2 size={16} /> Each withdrawal receives an operator
              review.
            </li>
            <li>
              <Wallet size={16} /> Use a wallet on the correct blockchain
              network.
            </li>
            <li>
              <Activity size={16} /> Track the request in transaction history.
            </li>
          </ul>
          <Link href="/dashboard/transactions" className="ws-text-button">
            View withdrawal activity <ArrowUpRight size={16} />
          </Link>
          <Link href="/videos#withdrawal-guide" className="ws-text-button">
            Watch the withdrawal guide <ArrowUpRight size={16} />
          </Link>
        </Panel>
      </div>
    </div>
  )}</TranslatedContent>;
}
function Transactions() {
  useDisplayLocale();
  const r = useRemote("/transactions");
  const [filter, setFilter] = useState("all");
  return <TranslatedContent>{(
    <Panel
      title="Account activity"
      action={
        <a
          className="ws-button ws-button-small"
          href="/api/statements"
          target="_blank"
          rel="noreferrer"
        >
          <FileText size={15} /> Export statement
        </a>
      }
    >
      <div className="ws-tabs" role="tablist" aria-label="Transaction type">
        {[
          "all",
          "deposit",
          "investment",
          "withdrawal",
          "earning",
          "referral",
        ].map((v) => (
          <button
            role="tab"
            aria-selected={filter === v}
            className={filter === v ? "is-active" : ""}
            key={v}
            onClick={() => setFilter(v)}
          >
            {v === "all"
              ? "All activity"
              : v.charAt(0).toUpperCase() + v.slice(1) + "s"}
          </button>
        ))}
      </div>
      <LoadState {...r} />
      {r.data && (
        <TransactionsTable
          rows={(r.data.transactions || []).filter(
            (t: RecordData) =>
              filter === "all" || t.type.toLowerCase().includes(filter),
          )}
        />
      )}
    </Panel>
  )}</TranslatedContent>;
}
function Referrals() {
  useDisplayLocale();
  const r = useRemote("/referrals");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return <TranslatedContent>{(
    <>
      <LoadState {...r} />
      <div className="ws-two-column">
        <Panel title="A connection worth sharing" eyebrow="YOUR INVITATION">
          <div className="ws-referral-visual">
            <Gift size={52} strokeWidth={1} />
            <span>Better, together.</span>
          </div>
          <p className="ws-panel-description">
            Invite someone to discover Aureon with your personal link.
            Commissions appear only when an eligible investment is approved.
          </p>
          <div className="ws-copy-field">
            <code>
              {origin}/register?ref={r.data?.referralCode || "…"}
            </code>
            {r.data?.referralCode && (
              <CopyButton
                value={`${origin}/register?ref=${r.data.referralCode}`}
                label="Copy link"
              />
            )}
          </div>
        </Panel>
        <Panel title="Your referral impact" eyebrow="GROW YOUR NETWORK">
          <div className="ws-referral-stats">
            <div>
              <strong>{r.data?.referrals?.length ?? "—"}</strong>
              <span>People referred</span>
            </div>
            <div>
              <strong>{r.data ? money(r.data.totalEarned) : "—"}</strong>
              <span>Realized commissions</span>
            </div>
          </div>
          <p className="ws-panel-description">
            Referral rewards are subject to program terms and platform review.
            Self-referrals and duplicate accounts are not eligible.
          </p>
        </Panel>
      </div>
      <Panel title="Referral activity">
        {r.data?.referrals?.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {r.data.referrals.map((ref: RecordData) => (
                  <tr key={ref.id}>
                    <td>{ref.name || "Referred member"}</td>
                    <td>
                      <DateText value={ref.createdAt} />
                    </td>
                    <td>
                      <Badge value={ref.kycStatus || "registered"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Users} title="Your circle is just getting started">
            Share your personal invitation link to start your referral journey.
          </Empty>
        )}
      </Panel>
    </>
  )}</TranslatedContent>;
}
function Account({
  user,
  refreshUser,
}: {
  user: RecordData;
  refreshUser: () => void;
}) {
  useDisplayLocale();
  const kyc = useRemote("/kyc");
  return <TranslatedContent>{(
    <div className="ws-two-column ws-account-grid">
      <div>
        <Panel title="Personal details" eyebrow="YOUR PROFILE">
          <ActionForm path="/profile" method="PATCH" onSuccess={refreshUser}>
            <Field
              label="Full name"
              name="name"
              defaultValue={user.name}
              required
            />
            <Field label="Email address" name="email">
              <input value={user.email} disabled readOnly />
            </Field>
            <div className="ws-inline-status">
              <span>Email verification</span>
              <Badge value={user.emailVerified ? "verified" : "unverified"} />
            </div>
            {!user.emailVerified && (
              <p className="ws-muted">
                Open the verification link sent to your email. If email delivery
                is not yet configured, contact platform support.
              </p>
            )}
          </ActionForm>
        </Panel>
        <Panel
          title="Identity verification"
          eyebrow="A TRUSTED FOUNDATION"
          action={<Badge value={user.kycStatus || "not_submitted"} />}
        >
          {user.kycStatus === "APPROVED" ? (
            <Notice tone="success">
              Your identity review has been approved.
            </Notice>
          ) : user.kycStatus === "PENDING" ? (
            <Notice>
              Your identity details are under manual review. You will be
              notified when the review is complete.
            </Notice>
          ) : (
            <>
              <p className="ws-panel-description">
                Submit your details for an operator’s identity review. This form
                collects identity metadata; it does not upload identity
                documents.
              </p>
              {kyc.data?.kyc?.reviewNote && (
                <Notice tone="error">{kyc.data.kyc.reviewNote}</Notice>
              )}
              <ActionForm
                path="/kyc"
                submit="Submit for identity review"
                onSuccess={() => {
                  void kyc.reload();
                  refreshUser();
                }}
              >
                <Field
                  label="Legal full name"
                  name="fullName"
                  required
                  defaultValue={user.name}
                />
                <div className="ws-form-row">
                  <Field
                    label="Country of residence"
                    name="country"
                    required
                    placeholder="Country"
                  />
                  <Field
                    label="Date of birth"
                    name="dateOfBirth"
                    type="date"
                    required
                  />
                </div>
                <Field label="Document type" name="documentType">
                  <select name="documentType" required>
                    <option value="passport">Passport</option>
                    <option value="national_id">National identity card</option>
                    <option value="drivers_license">Driver’s license</option>
                  </select>
                </Field>
                <Field
                  label="Document number"
                  name="documentNumber"
                  required
                  placeholder="As printed on your identity document"
                />
                <label className="ws-checkbox">
                  <input type="checkbox" required /> I confirm these details are
                  accurate and consent to their use for identity review.
                </label>
              </ActionForm>
            </>
          )}
        </Panel>
      </div>
      <div>
        <TwoFactorSettings user={user} refreshUser={refreshUser} />
        <PasskeySettings administrator={user.role === "ADMIN"} twoFactorEnabled={Boolean(user.twoFactorEnabled)} />
        <WalletConnections
          emailVerified={Boolean(user.emailVerified)}
        />
        <Panel title="Account security">
          <ul className="ws-check-list">
            <li>
              <Shield size={16} /> Use a unique password for your Aureon
              account.
            </li>
            <li>
              <Check size={16} /> Review every wallet address before sending.
            </li>
            <li>
              <CircleHelp size={16} /> Aureon will never ask for your password
              or authenticator setup key.
            </li>
          </ul>
          <Link href="/forgot-password" className="ws-text-button">
            Reset your password <ArrowUpRight size={16} />
          </Link>
        </Panel>
      </div>
    </div>
  )}</TranslatedContent>;
}
