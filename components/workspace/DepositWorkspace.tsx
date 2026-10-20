"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, Circle, Copy, FileCheck2, History, LoaderCircle, LockKeyhole, ShieldCheck, Wallet } from "lucide-react";
import { api, money } from "@/lib/api";
import { Badge, DateText, LoadState, Notice, useRemote, type RecordData } from "./shared";
import "./deposits.css";

type ReceivingWallet = { id: string; asset: string; network: string; address: string };
type Deposit = { id: string; type: string; asset: string; network: string; amount: number; status: string; createdAt: string };
const coins: Record<string, { name: string; color: string }> = {
  BTC: { name: "Bitcoin", color: "#f0a340" }, ETH: { name: "Ethereum", color: "#a6b5ee" },
  USDT: { name: "Tether", color: "#62c8a6" }, BNB: { name: "BNB", color: "#e9c45a" }, SOL: { name: "Solana", color: "#b6a0f2" },
};
const coinOrder = Object.keys(coins);
const networks: Record<string, { name: string; tag: string }> = {
  Bitcoin: { name: "Bitcoin", tag: "BTC" }, Ethereum: { name: "Ethereum", tag: "ERC20" },
  ERC20: { name: "Ethereum", tag: "ERC20" }, TRC20: { name: "TRON", tag: "TRC20" },
  BSC: { name: "BNB Smart Chain", tag: "BEP20" }, Solana: { name: "Solana", tag: "SOL" },
};
function coin(asset: string) { return coins[asset] ?? { name: asset, color: "#c9a24b" }; }
function network(value: string) { return networks[value] ?? { name: value, tag: value }; }

function CoinIcon({ asset }: { asset: string }) {
  return <span className="dp-coin" style={{ "--coin-color": coin(asset).color } as CSSProperties} aria-hidden="true">
    {asset === "ETH" ? <svg viewBox="0 0 24 24"><path d="M12 2 5.5 12 12 15.7 18.5 12 12 2Zm0 15.2L5.5 13.5 12 22l6.5-8.5-6.5 3.7Z" fill="currentColor" /></svg>
      : asset === "BNB" ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 5.2 5.2-2 2L12 6l-3.2 3.2-2-2L12 2ZM4.8 9.2 7.6 12l-2.8 2.8L2 12l2.8-2.8ZM12 9.2l2.8 2.8-2.8 2.8L9.2 12 12 9.2Zm7.2 0L22 12l-2.8 2.8-2.8-2.8 2.8-2.8ZM8.8 14.8 12 18l3.2-3.2 2 2L12 22l-5.2-5.2 2-2Z" /></svg>
      : asset === "SOL" ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h16l-3 4H2l3-4Zm-3 6h16l3 4H5l-3-4Zm3 6h16l-3 4H2l3-4Z" /></svg>
      : <span>{asset === "BTC" ? "₿" : asset === "USDT" ? "₮" : asset.slice(0, 1)}</span>}
  </span>;
}

export function DepositWorkspace({ user }: { user: RecordData }) {
  const catalog = useRemote<{ wallets: ReceivingWallet[]; fundingEnabled: boolean }>("/wallets");
  const activity = useRemote<{ transactions: Deposit[] }>("/transactions");
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [code, setCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [receipt, setReceipt] = useState<Deposit | null>(null);
  const wallets = [...(catalog.data?.wallets ?? [])].sort((a, b) =>
    (coinOrder.indexOf(a.asset) < 0 ? 99 : coinOrder.indexOf(a.asset)) - (coinOrder.indexOf(b.asset) < 0 ? 99 : coinOrder.indexOf(b.asset)),
  );
  const assets = [...new Set(wallets.map(wallet => wallet.asset))];
  const selected = wallets.find(wallet => wallet.id === selectedId) ?? wallets[0];
  const selectedNetwork = selected ? network(selected.network) : null;
  const accountChecks = [
    { name: "Email verified", ready: Boolean(user.emailVerified) },
    { name: "Identity approved", ready: user.kycStatus === "APPROVED" },
    { name: "Authenticator enabled", ready: Boolean(user.twoFactorEnabled) },
  ];
  const eligible = accountChecks.every(check => check.ready);
  const fundingOpen = Boolean(catalog.data?.fundingEnabled && wallets.length);
  const canSubmit = fundingOpen && eligible && Boolean(selected);
  const deposits = (activity.data?.transactions ?? []).filter(item => item.type === "DEPOSIT").slice(0, 3);

  useEffect(() => {
    setAmount(""); setTxHash(""); setCode(""); setConfirmed(false);
    setError(""); setReceipt(null); setCopyStatus("");
  }, [selected?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canSubmit || busy) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ deposit: Deposit }>("/deposits", {
        method: "POST",
        body: JSON.stringify({ walletId: selected.id, amount: Number(amount), txHash: txHash.trim(), code: code.trim() }),
      });
      if (!result.deposit?.id) throw new Error("Submission could not be confirmed. Check transaction activity before retrying.");
      setReceipt(result.deposit); setAmount(""); setTxHash(""); setCode(""); setConfirmed(false);
      void activity.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your deposit could not be submitted.");
      if (typeof cause === "object" && cause && "status" in cause && cause.status === 503) void catalog.reload();
    } finally { setBusy(false); }
  }

  if (!catalog.data || catalog.error) return <LoadState {...catalog} />;

  return <div className="dp-workspace">
    <div className="dp-journey">
      <div className="dp-journey-label"><ArrowDownLeft size={18} /><span>A CLEAR PATH TO YOUR ACCOUNT</span></div>
      <ol><li><span>01</span> Choose your currency</li><li><span>02</span> Make your transfer</li><li><span>03</span> Submit for review</li></ol>
      <span className={`dp-availability ${fundingOpen ? "is-open" : ""}`}><i />{fundingOpen ? "Deposits open" : "Deposits paused"}</span>
    </div>
    {!catalog.data.fundingEnabled && <Notice>Funding is currently unavailable. Please wait until deposits reopen before sending funds.</Notice>}
    {!eligible && <div className="dp-readiness">
      <ShieldCheck size={21} /><div><strong>Before you send, complete your account setup.</strong><p>These checks are required to submit a deposit for review.</p>
        <div className="dp-readiness-checks">{accountChecks.map(check => <span key={check.name} className={check.ready ? "is-ready" : ""}>{check.ready ? <Check size={12} /> : <Circle size={11} />}{check.name}</span>)}</div>
      </div><Link href="/dashboard/account">Complete setup <ArrowUpRight size={15} /></Link>
    </div>}
    {!wallets.length ? <div className="dp-no-wallets"><Wallet size={30} /><h2>No receiving wallets available</h2><p>Deposit details will appear here when a receiving wallet is available.</p><Link href="/support">Contact support <ArrowUpRight size={14} /></Link></div> : <div className="dp-layout">
      <div className="dp-main">
        <section className="dp-panel dp-selection" aria-labelledby="dp-choose-heading">
          <div className="dp-section-heading"><span className="dp-step">01</span><div><h2 id="dp-choose-heading">Choose your currency</h2><p>{assets.length} currencies. {wallets.length} deposit options. One clear next step.</p></div></div>
          <div className="dp-assets" aria-label="Deposit currency">{assets.map(asset => <button key={asset} type="button" aria-pressed={selected?.asset === asset} disabled={busy} onClick={() => setSelectedId(wallets.find(wallet => wallet.asset === asset)!.id)} className={selected?.asset === asset ? "is-selected" : ""}>
            <CoinIcon asset={asset} /><strong>{asset}</strong><small>{coin(asset).name}</small>{selected?.asset === asset && <Check size={12} className="dp-asset-check" />}
          </button>)}</div>
          <fieldset className="dp-networks"><legend>Choose the transfer network</legend><div>{wallets.filter(wallet => wallet.asset === selected?.asset).map(wallet => {
            const chain = network(wallet.network);
            return <label key={wallet.id} className={wallet.id === selected?.id ? "is-selected" : ""}><input type="radio" name="depositNetwork" value={wallet.id} checked={wallet.id === selected?.id} disabled={busy} onChange={() => setSelectedId(wallet.id)} /><span className="dp-radio-dot" /><span>{chain.name}</span><small>{chain.tag}</small></label>;
          })}</div></fieldset>
          <p className="dp-network-hint"><ShieldCheck size={14} />Your sending wallet must use the same network selected here.</p>
        </section>
        <section className="dp-panel dp-destination" aria-labelledby="dp-address-heading">
          <div className="dp-section-heading"><span className="dp-step">02</span><div><h2 id="dp-address-heading">Your receiving address</h2><p>Use this destination for your {selected.asset} transfer.</p></div><span className="dp-network-badge">{selectedNetwork?.tag}</span></div>
          {fundingOpen ? <>
            <div className="dp-receive-layout"><div className="dp-address-content">
              <div className="dp-receive-asset"><CoinIcon asset={selected.asset} /><div><strong>{coin(selected.asset).name}</strong><span>{selectedNetwork?.name} network</span></div></div>
              <span id="dp-address-label" className="dp-small-label">DEPOSIT ADDRESS</span>
              <code aria-labelledby="dp-address-label" data-testid="deposit-address" className="dp-address" tabIndex={0}>{selected.address}</code>
              <button type="button" className="dp-copy-button" aria-label="Copy deposit address" onClick={async () => {
                try { await navigator.clipboard.writeText(selected.address); setCopyStatus("Address copied"); }
                catch { setCopyStatus("Copy unavailable. Select the address above to copy it manually."); }
              }}>{copyStatus === "Address copied" ? <Check size={15} /> : <Copy size={15} />}{copyStatus === "Address copied" ? "Address copied" : "Copy address"}</button>
              <span className="dp-copy-status" aria-live="polite">{copyStatus}</span>
            </div><div className="dp-qr"><div className="dp-qr-code" data-testid="deposit-qr"><QRCodeSVG value={selected.address} title={`${selected.asset} receiving address`} size={176} level="M" marginSize={4} /></div><span>Scan with your sending wallet</span></div></div>
            <div className="dp-network-note"><ShieldCheck size={17} /><p><strong>Send only {selected.asset} on {selectedNetwork?.name} ({selectedNetwork?.tag}).</strong> A transfer on another network can result in a loss of funds. Network fees are charged by your sending wallet.</p></div>
          </> : <div className="dp-paused"><LockKeyhole size={24} /><strong>Receiving details are temporarily paused.</strong><p>Your address and QR code will be available when deposits reopen.</p></div>}
        </section>
        <section className="dp-panel dp-history" aria-labelledby="dp-history-heading"><div className="dp-history-heading"><div><History size={17} /><h2 id="dp-history-heading">Recent deposits</h2></div><Link href="/dashboard/transactions">View all activity <ArrowUpRight size={14} /></Link></div>
          {activity.loading && !activity.data ? <p className="dp-history-empty">Loading deposit activity…</p> : activity.error ? <><Notice tone="error">{activity.error}</Notice><button className="ws-text-button" onClick={() => void activity.reload()}>Reload deposit activity</button></> : deposits.length ? <div className="dp-history-list">{deposits.map(deposit => <div className="dp-history-row" key={deposit.id}><CoinIcon asset={deposit.asset} /><div><strong>{deposit.asset} deposit</strong><span>{network(deposit.network).name} · <DateText value={deposit.createdAt} /></span></div><div className="dp-history-value"><strong>{money(deposit.amount)}</strong><Badge value={deposit.status} /></div></div>)}</div> : <div className="dp-history-empty"><span className="dp-empty-icon"><ArrowDownLeft size={18} /></span><div><strong>A fresh start.</strong><p>Your submitted deposits will appear here. No activity yet.</p></div></div>}
        </section>
      </div>
      <aside className="dp-sidebar">
        <section className="dp-panel dp-confirm" aria-labelledby="dp-submit-heading"><div className="dp-section-heading"><span className="dp-step">03</span><div><span className="dp-small-label">CONFIRM YOUR TRANSFER</span><h2 id="dp-submit-heading">Submit a deposit</h2></div></div>
          {receipt ? <div className="dp-receipt" role="status"><span><CheckCircle2 size={30} /></span><h3>Submitted for review.</h3><p>Your {receipt.asset} deposit is pending verification. Your balance changes only after approval.</p><div><span>Declared value</span><strong>{money(receipt.amount)}</strong></div><Link className="dp-primary-button" href="/dashboard/transactions">Track your deposit <ArrowUpRight size={15} /></Link><button className="ws-text-button" onClick={() => setReceipt(null)}>Submit another transfer <ArrowRight size={14} /></button></div> : <>
            <p className="dp-confirm-intro">Already sent your funds? Add the details below so the transfer can be reviewed.</p>
            <div className="dp-transfer-summary"><CoinIcon asset={selected.asset} /><div><strong>{selected.asset}</strong><span>{selectedNetwork?.name}</span></div><span>{selectedNetwork?.tag}</span></div>
            <form className="dp-form" onSubmit={submit}><input type="hidden" name="walletId" value={selected.id} />
              <fieldset disabled={busy || !canSubmit}>
                <label htmlFor="dp-amount">Declared value (USD)</label><div className="dp-amount-input"><span>$</span><input id="dp-amount" name="amount" type="number" min="0.01" step="0.01" required inputMode="decimal" placeholder="0.00" value={amount} onChange={event => setAmount(event.target.value)} /><small>USD</small></div><p className="dp-field-help">Enter the USD value you are declaring for review.</p>
                <label htmlFor="dp-hash">Blockchain transaction hash</label><input id="dp-hash" name="txHash" required autoComplete="off" spellCheck={false} placeholder={selectedNetwork?.tag === "ERC20" || selectedNetwork?.tag === "BEP20" ? "0x…" : "Paste your transaction hash"} value={txHash} onChange={event => setTxHash(event.target.value)} /><p className="dp-field-help">Find this in your sending wallet’s transaction details.</p>
                <label htmlFor="dp-code">Authenticator code <LockKeyhole size={12} /></label><input id="dp-code" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" value={code} onChange={event => setCode(event.target.value)} />
                <label className="dp-confirm-check"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>I sent {selected.asset} on {selectedNetwork?.name} to the address shown.</span></label>
              </fieldset>
              {error && <Notice tone="error">{error}</Notice>}
              <button className="dp-primary-button" type="submit" disabled={busy || !canSubmit}>{busy ? <LoaderCircle size={16} className="ws-spin" /> : <FileCheck2 size={16} />}{busy ? "Submitting…" : "Submit for verification"}{!busy && <ArrowRight size={16} />}</button>
              <p className="dp-submit-note"><LockKeyhole size={12} />{!fundingOpen ? "Available when deposits reopen." : !eligible ? "Complete account setup to submit a deposit." : "Submitted transfers are reviewed before crediting."}</p>
            </form>
          </>}
        </section>
        <div className="dp-review-note"><span><FileCheck2 size={19} /></span><div><strong>Every transfer, accounted for.</strong><p>Your transaction is checked on its network before an administrator approves the deposit. A submitted hash does not credit your balance.</p><Link href="/support">Need a hand? <ArrowUpRight size={13} /></Link></div></div>
      </aside>
    </div>}
  </div>;
}
