"use client";
import TranslatedContent, { Verbatim } from "@/components/TranslatedContent";
import { displayLocale, useDisplayLocale } from "@/lib/i18n";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, Circle, Copy, FileCheck2, History, LoaderCircle, LockKeyhole, ShieldCheck, Wallet, X, RefreshCw } from "lucide-react";
import { api, money } from "@/lib/api";
import { Badge, DateText, LoadState, Notice, useRemote, useModalFocus, type RecordData } from "./shared";
import { depositCoinAmount, depositUsdCents, type DepositInstructions, type DepositPrice } from "@/lib/deposits";
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
function priceMoney(value: string) { return new Intl.NumberFormat(displayLocale(), { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(Number(value)); }

function CoinIcon({ asset }: { asset: string }) {
  useDisplayLocale();
  return <TranslatedContent>{<span className="dp-coin" style={{ "--coin-color": coin(asset).color } as CSSProperties} aria-hidden="true">
    {asset === "ETH" ? <svg viewBox="0 0 24 24"><path d="M12 2 5.5 12 12 15.7 18.5 12 12 2Zm0 15.2L5.5 13.5 12 22l6.5-8.5-6.5 3.7Z" fill="currentColor" /></svg>
      : asset === "BNB" ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 5.2 5.2-2 2L12 6l-3.2 3.2-2-2L12 2ZM4.8 9.2 7.6 12l-2.8 2.8L2 12l2.8-2.8ZM12 9.2l2.8 2.8-2.8 2.8L9.2 12 12 9.2Zm7.2 0L22 12l-2.8 2.8-2.8-2.8 2.8-2.8ZM8.8 14.8 12 18l3.2-3.2 2 2L12 22l-5.2-5.2 2-2Z" /></svg>
      : asset === "SOL" ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h16l-3 4H2l3-4Zm-3 6h16l3 4H5l-3-4Zm3 6h16l-3 4H2l3-4Z" /></svg>
      : <span>{asset === "BTC" ? "₿" : asset === "USDT" ? "₮" : asset.slice(0, 1)}</span>}
  </span>}</TranslatedContent>;
}


export function DepositWorkspace({ user }: { user: RecordData }) {
  useDisplayLocale();
  const catalog = useRemote<{ wallets: ReceivingWallet[]; fundingEnabled: boolean }>("/wallets");
  const activity = useRemote<{ transactions: Deposit[] }>("/transactions");
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState<DepositPrice | null>(null);
  const [pricingError, setPricingError] = useState("");
  const [pricing, setPricing] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const priceRequest = useRef(0);
  const [quote, setQuote] = useState<DepositInstructions | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Deposit | null>(null);
  const storageKey = `aureon-deposit-instructions:${user.id}`;
  const wallets = [...(catalog.data?.wallets ?? [])].sort((a, b) =>
    (coinOrder.indexOf(a.asset) < 0 ? 99 : coinOrder.indexOf(a.asset)) - (coinOrder.indexOf(b.asset) < 0 ? 99 : coinOrder.indexOf(b.asset)),
  );
  const assets = [...new Set(wallets.map(wallet => wallet.asset))];
  const selected = wallets.find(wallet => wallet.id === selectedId) ?? wallets[0];
  const accountChecks = [
    { name: "Email verified", ready: Boolean(user.emailVerified) },
    { name: "Identity approved", ready: user.kycStatus === "APPROVED" },
  ];
  const eligible = accountChecks.every(check => check.ready);
  const fundingOpen = Boolean(catalog.data?.fundingEnabled && wallets.length);
  const canSubmit = fundingOpen && eligible && Boolean(selected);
  const amountCents = depositUsdCents(amount);
  const currentPrice = price && selected && price.asset === selected.asset && Date.parse(price.expiresAt) > clock ? price : null;
  const coinAmount = amountCents && currentPrice ? depositCoinAmount(amountCents, currentPrice.priceUsd, selected.asset) : null;
  const deposits = (activity.data?.transactions ?? []).filter(item => item.type === "DEPOSIT").slice(0, 3);

  const refreshPrice = useCallback(async () => {
    const request = ++priceRequest.current;
    if (!selected?.asset) return;
    setPricing(true); setPricingError("");
    try {
      const result = await api<{ price: DepositPrice }>(`/deposit-price?asset=${encodeURIComponent(selected.asset)}`);
      if (request === priceRequest.current) { setPrice(result.price); setClock(Date.now()); }
    } catch (cause) {
      if (request === priceRequest.current) setPricingError(cause instanceof Error ? cause.message : "Live deposit pricing is temporarily unavailable.");
    } finally { if (request === priceRequest.current) setPricing(false); }
  }, [selected?.asset]);
  useEffect(() => {
    setPrice(null); void refreshPrice();
    const interval = setInterval(() => void refreshPrice(), 30_000);
    return () => { clearInterval(interval); ++priceRequest.current; };
  }, [refreshPrice]);
  useEffect(() => { const interval = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(interval); }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved?.quote?.quoteToken && typeof saved.quote.cryptoAmount === "string" && typeof saved.quote.address === "string") {
        setQuote(saved.quote); setTxHash(saved.txHash || ""); setAmount((saved.quote.amountCents / 100).toFixed(2)); setSelectedId(saved.quote.walletId);
      }
    } catch { /* A missing or invalid local draft does not prevent a new deposit. */ }
  }, [storageKey]);
  useEffect(() => {
    if (!quote) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ quote, txHash })); } catch { /* The open payment window still retains its instructions. */ }
  }, [quote, txHash, storageKey]);
  function clearDraft() { setQuote(null); setTxHash(""); setError(""); try { sessionStorage.removeItem(storageKey); } catch {} }
  async function proceed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canSubmit || !amountCents || !currentPrice || busy) return;
    setBusy(true); setError(""); setReceipt(null);
    try {
      const result = await api<{ quote: DepositInstructions }>("/deposits/quote", { method: "POST", body: JSON.stringify({ walletId: selected.id, amount }) });
      setQuote(result.quote); setTxHash(""); setPaymentOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment instructions could not be prepared.");
      if (typeof cause === "object" && cause && "status" in cause && cause.status === 503) void catalog.reload();
    } finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || !canSubmit || busy) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ deposit: Deposit }>("/deposits", { method: "POST", body: JSON.stringify({ walletId: quote.walletId, amount: quote.amountCents / 100, txHash: txHash.trim(), quoteToken: quote.quoteToken }) });
      if (!result.deposit?.id) throw new Error("Submission could not be confirmed. Check transaction activity before retrying.");
      setReceipt(result.deposit); setPaymentOpen(false); clearDraft(); setAmount(""); void activity.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your deposit could not be submitted.");
      if (typeof cause === "object" && cause && "status" in cause && cause.status === 503) void catalog.reload();
    } finally { setBusy(false); }
  }
  if (!catalog.data || catalog.error) return <TranslatedContent><LoadState {...catalog} /></TranslatedContent>;
  return <TranslatedContent><div className="dp-workspace">
    <div className="dp-journey">
      <div className="dp-journey-label"><ArrowDownLeft size={18} /><span>FUND YOUR NEXT CHAPTER</span></div>
      <ol><li><span>01</span> Amount & currency</li><li><span>02</span> Send your crypto</li><li><span>03</span> Done & review</li></ol>
      <span className={`dp-availability ${fundingOpen ? "is-open" : ""}`}><i />{fundingOpen ? "Deposits open" : "Deposits paused"}</span>
    </div>
    {!catalog.data.fundingEnabled && <Notice>Funding is currently unavailable. Please wait until deposits reopen before sending funds.</Notice>}
    {!eligible && <div className="dp-readiness"><ShieldCheck size={21} /><div><strong>Before you send, complete your account setup.</strong><p>These checks are required to submit a deposit for review.</p><div className="dp-readiness-checks">{accountChecks.map(check => <span key={check.name} className={check.ready ? "is-ready" : ""}>{check.ready ? <Check size={12} /> : <Circle size={11} />}{check.name}</span>)}</div></div><Link href="/dashboard/account">Complete setup <ArrowUpRight size={15} /></Link></div>}
    {receipt && <section className="dp-panel dp-receipt" role="status"><span><CheckCircle2 size={30} /></span><h3>Submitted for review.</h3><p>Your {receipt.asset} deposit is pending verification. Your balance changes only after approval.</p><div><span>Declared value</span><strong>{money(receipt.amount)}</strong></div><Link href="/dashboard/transactions">Track your deposit <ArrowUpRight size={15} /></Link></section>}
    {!wallets.length ? <div className="dp-no-wallets"><Wallet size={30} /><h2>No receiving wallets available</h2><p>Deposit details will appear here when a receiving wallet is available.</p><Link href="/support">Contact support <ArrowUpRight size={14} /></Link></div> : <div className="dp-layout">
      <div className="dp-main">
        <section className="dp-panel dp-selection" aria-labelledby="dp-choose-heading">
          <div className="dp-section-heading"><span className="dp-step">01</span><div><span className="dp-small-label">YOUR DEPOSIT, YOUR CHOICE</span><h2 id="dp-choose-heading">Add funds</h2><p>Enter an amount, choose your crypto and preview the live conversion.</p></div></div>
          {quote ? <div className="dp-saved-payment"><Wallet size={25} /><h3>Your payment instructions are ready.</h3><p>Resume this transfer to keep the same address and coin amount, including after returning from your wallet app.</p><strong><Verbatim>{quote.cryptoAmount} {quote.asset}</Verbatim></strong><span>{money(quote.amountCents / 100)} · <Verbatim>{network(quote.network).name}</Verbatim></span><button className="dp-primary-button" onClick={() => setPaymentOpen(true)}>Resume payment <ArrowRight size={16} /></button><button className="ws-text-button" onClick={clearDraft}>Start a different deposit</button></div> : <form className="dp-form" onSubmit={proceed}>
            <fieldset disabled={busy || !canSubmit}>
              <label htmlFor="dp-amount">Deposit amount (USD)</label><div className="dp-amount-input"><span>$</span><input id="dp-amount" name="amount" type="number" min="0.01" max="10000000" step="0.01" required inputMode="decimal" placeholder="0.00" value={amount} onChange={event => setAmount(event.target.value)} /><small>USD</small></div><p className="dp-field-help">Your account is valued in USD. Choose the cryptocurrency you will send below.</p>
              <div className="dp-currency-label">Pay with cryptocurrency</div>
              <div className="dp-assets" aria-label="Deposit currency">{assets.map(asset => <button key={asset} type="button" aria-pressed={selected?.asset === asset} onClick={() => { setSelectedId(wallets.find(wallet => wallet.asset === asset)!.id); setError(""); }} className={selected?.asset === asset ? "is-selected" : ""}><CoinIcon asset={asset} /><strong>{asset}</strong><small>{coin(asset).name}</small>{selected?.asset === asset && <Check size={12} className="dp-asset-check" />}</button>)}</div>
              <div className="dp-networks" role="group" aria-label="Choose the transfer network"><div className="dp-currency-label">Choose the transfer network</div><div>{wallets.filter(wallet => wallet.asset === selected?.asset).map(wallet => { const chain = network(wallet.network); return <label key={wallet.id} className={wallet.id === selected?.id ? "is-selected" : ""}><input type="radio" name="depositNetwork" value={wallet.id} checked={wallet.id === selected?.id} onChange={() => setSelectedId(wallet.id)} /><span className="dp-radio-dot" /><span>{chain.name}</span><small>{chain.tag}</small></label>; })}</div></div>
            </fieldset>
            <div className="dp-live-conversion" aria-live="polite"><span className="dp-small-label">YOU WILL SEND</span><strong data-testid="deposit-preview-amount"><Verbatim>{coinAmount ? `${coinAmount} ${selected.asset}` : "—"}</Verbatim></strong>{currentPrice ? <><span><Verbatim>1 {selected.asset} = {priceMoney(currentPrice.priceUsd)}</Verbatim></span><small>Live price · <Verbatim>{currentPrice.source}</Verbatim> · updates every 30 seconds</small></> : <p>{pricing ? "Getting the current market price…" : "A current price is needed to continue."}</p>}<button type="button" className="ws-text-button" onClick={() => void refreshPrice()} disabled={pricing}><RefreshCw size={13} className={pricing ? "ws-spin" : ""} />Refresh price</button></div>
            {pricingError && <Notice tone="error">{pricingError}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            <button className="dp-primary-button" type="submit" disabled={busy || !canSubmit || !amountCents || !currentPrice}>{busy ? <LoaderCircle size={16} className="ws-spin" /> : <Wallet size={16} />}{busy ? "Preparing payment…" : "Proceed to payment"}<ArrowRight size={16} /></button>
            <p className="dp-submit-note"><LockKeyhole size={12} />{!fundingOpen ? "Available when deposits reopen." : !eligible ? "Complete account setup to submit a deposit." : "Your address and exact coin amount appear in the next step."}</p>
          </form>}
        </section>
        <section className="dp-panel dp-history" aria-labelledby="dp-history-heading"><div className="dp-history-heading"><div><History size={17} /><h2 id="dp-history-heading">Recent deposits</h2></div><Link href="/dashboard/transactions">View all activity <ArrowUpRight size={14} /></Link></div>
          {activity.loading && !activity.data ? <p className="dp-history-empty">Loading deposit activity…</p> : activity.error ? <><Notice tone="error">{activity.error}</Notice><button className="ws-text-button" onClick={() => void activity.reload()}>Reload deposit activity</button></> : deposits.length ? <div className="dp-history-list">{deposits.map(deposit => <div className="dp-history-row" key={deposit.id}><CoinIcon asset={deposit.asset} /><div><strong>{deposit.asset} deposit</strong><span>{network(deposit.network).name} · <DateText value={deposit.createdAt} /></span></div><div className="dp-history-value"><strong>{money(deposit.amount)}</strong><Badge value={deposit.status} /></div></div>)}</div> : <div className="dp-history-empty"><span className="dp-empty-icon"><ArrowDownLeft size={18} /></span><div><strong>A fresh start.</strong><p>Your submitted deposits will appear here. No activity yet.</p></div></div>}
        </section>
      </div>
      <aside className="dp-sidebar"><section className="dp-panel dp-how-to"><span className="dp-small-label">A SIMPLE WAY TO FUND</span><h2>From your wallet to your workspace.</h2><ol><li><span>01</span><div><strong>Set your amount</strong><p>Choose a USD amount, cryptocurrency and matching network. Review the current conversion.</p></div></li><li><span>02</span><div><strong>Make the transfer</strong><p>Copy the address and exact coin amount, or scan the address QR code. Send using your wallet app.</p></div></li><li><span>03</span><div><strong>Come back and choose Done</strong><p>Paste the blockchain transaction hash to report your transfer for verification.</p></div></li></ol><div className="dp-review-note"><FileCheck2 size={19} /><div><strong>Every transfer, accounted for.</strong><p>Network fees are separate. Your final USD credit is confirmed during review; a market conversion or Done does not credit your balance.</p><Link href="/videos#deposit-guide">Watch the deposit guide <ArrowUpRight size={12} /></Link></div></div></section></aside>
    </div>}
    {paymentOpen && quote && <PaymentDialog quote={quote} txHash={txHash} setTxHash={setTxHash} busy={busy} error={error} canSubmit={canSubmit} onSubmit={submit} onClose={() => { if (!busy) setPaymentOpen(false); }} />}
  </div></TranslatedContent>;
}

function PaymentDialog({ quote, txHash, setTxHash, busy, error, canSubmit, onSubmit, onClose }: {
  quote: DepositInstructions; txHash: string; setTxHash: (value: string) => void; busy: boolean; error: string; canSubmit: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void;
}) {
  useDisplayLocale();
  const [copyStatus, setCopyStatus] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const close = useCallback(() => closeRef.current(), []);
  useModalFocus(close);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, []);
  async function copy(value: string, kind: "address" | "amount") {
    try { await navigator.clipboard.writeText(value); setCopyStatus(kind === "address" ? "Address copied" : "Coin amount copied"); }
    catch { setCopyStatus("Copy unavailable. Select the address or amount to copy it manually."); }
  }
  const chain = network(quote.network);
  return createPortal(<TranslatedContent><div className="dp-payment-overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="dp-payment-dialog dp-panel" role="dialog" aria-modal="true" aria-labelledby="dp-payment-title" aria-describedby="dp-payment-description">
    <header className="dp-payment-header"><div><span className="dp-small-label">02 / MAKE YOUR TRANSFER</span><h2 id="dp-payment-title">Your deposit payment</h2></div><button type="button" className="dp-close" aria-label="Close payment instructions" disabled={busy} onClick={close}><X size={20} /></button></header>
    <p id="dp-payment-description" className="dp-confirm-intro">Send the exact coin amount below from your wallet app, then return here and choose Done.</p>
    <div className="dp-payment-total"><CoinIcon asset={quote.asset} /><div><span>Send exactly</span><strong data-testid="deposit-coin-amount" dir="ltr"><Verbatim>{quote.cryptoAmount} {quote.asset}</Verbatim></strong><small>{money(quote.amountCents / 100)} <span>declared value</span></small></div><button type="button" className="dp-copy-button" aria-label="Copy coin amount" onClick={() => void copy(quote.cryptoAmount, "amount")}><Copy size={14} /><span>Copy amount</span></button></div>
    {canSubmit ? <div className="dp-receive-layout"><div className="dp-address-content"><span className="dp-network-badge"><Verbatim>{quote.asset} · {chain.name} · {chain.tag}</Verbatim></span><span id="dp-address-label" className="dp-small-label">DEPOSIT ADDRESS</span><code aria-labelledby="dp-address-label" data-testid="deposit-address" className="dp-address" tabIndex={0} dir="ltr"><Verbatim>{quote.address}</Verbatim></code><button type="button" className="dp-copy-button" aria-label="Copy deposit address" onClick={() => void copy(quote.address, "address")}><Copy size={14} />Copy address</button></div><div className="dp-qr"><div className="dp-qr-code" data-testid="deposit-qr"><QRCodeSVG value={quote.address} title={`${quote.asset} receiving address`} size={176} level="M" marginSize={4} /></div><span>Scan with your sending wallet</span></div></div> : <Notice>Receiving details are unavailable while deposits are paused or account setup is incomplete.</Notice>}
    <p className="dp-copy-status" aria-live="polite">{copyStatus}</p>
    <div className="dp-network-note"><ShieldCheck size={18} /><p><strong>Send only {quote.asset} on {chain.name} ({chain.tag}).</strong>Use the exact network and ensure the recipient receives the amount shown after any wallet fees. The QR code contains the address; enter the coin amount separately.</p></div>
    <div className="dp-captured-rate"><span>Captured conversion</span><strong><Verbatim>1 {quote.asset} = {priceMoney(quote.priceUsd)}</Verbatim></strong><span><Verbatim>{quote.source} · {new Date(quote.quotedAt).toLocaleTimeString()}</Verbatim></span><p>The coin amount stays fixed for this transfer. Market prices can change; the final USD credit is confirmed during review.</p></div>
    <form className="dp-form" onSubmit={onSubmit}><fieldset disabled={busy || !canSubmit}><label htmlFor="dp-hash">Blockchain transaction hash</label><input id="dp-hash" name="txHash" required autoComplete="off" spellCheck={false} placeholder="Paste your transaction hash" value={txHash} onChange={event => setTxHash(event.target.value)} /><p className="dp-field-help">Find this in your sending wallet’s transaction details.</p><label className="dp-confirm-check"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>I sent {quote.asset} on {chain.name} to the address shown.</span></label></fieldset>
      {!canSubmit && <Notice>Deposit submission is currently unavailable. Keep your transaction hash and contact support if you have sent funds.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}<button className="dp-primary-button" type="submit" disabled={busy || !canSubmit}>{busy ? <LoaderCircle size={16} className="ws-spin" /> : <CheckCircle2 size={16} />}{busy ? "Submitting…" : "Done — I have sent the funds"}</button><p className="dp-submit-note"><LockKeyhole size={12} />Submitted transfers are reviewed before crediting.</p>
    </form>
  </section></div></TranslatedContent>, document.querySelector(".ws-shell") ?? document.body);
}
