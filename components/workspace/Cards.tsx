"use client";
import TranslatedContent, { Verbatim } from "@/components/TranslatedContent";
import { useDisplayLocale, displayLocale } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, CreditCard, RefreshCw, Search } from "lucide-react";
import CardShowcase from "@/components/cards/CardShowcase";
import { CARD_CONSENT_VERSION, cardStatusDescriptions, cardStatusLabels, type CardApplication, type CardNetwork, type CardStatus } from "@/lib/cards";
import { api } from "@/lib/api";
import { DateText, Empty, LoadState, Notice, Panel, useRemote, type RecordData } from "./shared";
import styles from "./cards.module.css";

type CardResponse = { program: { message: string }; application: CardApplication | null };
const active = (application: CardApplication) => !["DECLINED", "WITHDRAWN"].includes(application.status);
const reference = (application: CardApplication) => `CA-${application.id.slice(-8).toUpperCase()}`;
function Status({ status }: { status: CardStatus }) {
  useDisplayLocale(); return <TranslatedContent>{<span className={styles.status}>{cardStatusLabels[status]}</span>}</TranslatedContent>; }
function History({ application }: { application: CardApplication }) {
  useDisplayLocale();
  return <TranslatedContent>{<div className={styles.history}><h3>Recent status history</h3><ol>{application.events?.map(event => <li key={event.id}><div><strong>{cardStatusLabels[event.status]}</strong><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString(displayLocale())}</time></div><p>{event.message}</p></li>)}</ol></div>}</TranslatedContent>;
}

export function InvestorCards({ user }: { user: RecordData }) {
  useDisplayLocale();
  const r = useRemote<CardResponse>("/cards");
  const [network, setNetwork] = useState<CardNetwork>("MASTERCARD");
  const [record, setRecord] = useState<CardApplication | null | undefined>();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (r.data) { setRecord(r.data.application); if (r.data.application) setNetwork(r.data.application.network); } }, [r.data]);
  const application = record === undefined ? r.data?.application : record;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const result = await api<CardResponse>("/cards/applications", { method: "POST", body: JSON.stringify({ network, format: data.get("format"), country: data.get("country"), intendedUse: data.get("intendedUse"), consentVersion: CARD_CONSENT_VERSION, acknowledgePrelaunch: data.get("prelaunch") === "on", acknowledgePrivacy: data.get("privacy") === "on", confirmAdult: data.get("adult") === "on" }) });
      setRecord(result.application); void r.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Application could not be recorded."); }
    finally { setBusy(false); }
  }
  async function withdraw() {
    if (!application || busy) return; setBusy(true); setError("");
    try { const result = await api<{ application: CardApplication }>(`/cards/applications/${application.id}/withdraw`, { method: "POST", body: JSON.stringify({ version: application.version }) }); setRecord(result.application); void r.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Withdrawal could not be confirmed."); void r.reload(); }
    finally { setBusy(false); }
  }
  if (!r.data) return <TranslatedContent>{<LoadState {...r} />}</TranslatedContent>;
  return <TranslatedContent>{<div className={styles.root}>
    <Notice>{r.data.program.message}</Notice>
    <div className={styles.investorGrid}>
      <Panel title="The AUREON card concept" eyebrow="YOUR DESIGN PREFERENCE"><CardShowcase network={network} onNetworkChange={setNetwork} /><Link href="/cards#program-details" className="ws-text-button">Read the proposed program details <ArrowUpRight size={14} /></Link></Panel>
      <div>
        {application && <Panel title="Your application" eyebrow={reference(application)} action={<button type="button" className="ws-button ws-button-small" disabled={busy} onClick={() => void r.reload()}><RefreshCw size={13} /> Refresh</button>}>
          <Status status={application.status} /><p className={styles.statusCopy}>{cardStatusDescriptions[application.status]}</p>
          <dl className={styles.facts}><div><dt>Design preference</dt><dd>{application.network === "VISA" ? "Visa" : "Mastercard"}</dd></div><div><dt>Format preference</dt><dd>{application.format.toLowerCase()}</dd></div><div><dt>Residence</dt><dd><Verbatim>{application.country}</Verbatim></dd></div><div><dt>Submitted</dt><dd><DateText value={application.submittedAt} /></dd></div></dl>
          {application.reviewMessage && <div className={styles.reviewMessage}><strong>Review message</strong><p><Verbatim>{application.reviewMessage}</Verbatim></p></div>}
          {active(application) && <button type="button" className="ws-button ws-button-small" onClick={() => void withdraw()} disabled={busy}>{busy ? "Updating…" : "Withdraw application"}</button>}
          <History application={application} />
        </Panel>}
        {(!application || !active(application)) && <Panel title={application ? "Submit an updated application" : "Apply for preliminary review"} eyebrow="PRE-LAUNCH / NO CARD ISSUANCE">
          <p className={styles.intro}>Choose your preferences for the proposed credit-card program. AUREON review can place you on the pre-launch list; it cannot approve credit or issue a card.</p>
          <div className={styles.applicant}><span>YOUR EXISTING ACCOUNT</span><strong><Verbatim>{user.name}</Verbatim></strong><small><Verbatim>{user.email}</Verbatim></small></div>
          {!user.emailVerified && <Notice>Verify your account email before submitting. <Link href="/dashboard/account">Open account settings</Link>.</Notice>}
          <form className={styles.form} onSubmit={submit}>
            <fieldset disabled={busy || !user.emailVerified}>
              <label>Preferred network design<select aria-label="Preferred network design" value={network} onChange={event => setNetwork(event.target.value as CardNetwork)}><option value="MASTERCARD">Mastercard concept</option><option value="VISA">Visa concept</option></select></label>
              <label>Card format preference<select name="format" defaultValue={application?.format ?? "PHYSICAL"} required><option value="PHYSICAL">Physical card</option><option value="VIRTUAL">Virtual card</option></select></label>
              <label>Country of residence<input name="country" autoComplete="country-name" minLength={2} maxLength={80} required defaultValue={application?.country} placeholder="Enter the country where you live" /></label>
              <label>Intended use<select name="intendedUse" defaultValue={application?.intendedUse ?? "PERSONAL"} required><option value="PERSONAL">Personal use</option><option value="BUSINESS">Business use</option><option value="BOTH">Personal and business use</option></select></label>
              <label className={styles.checkbox}><input name="prelaunch" type="checkbox" required /><span>I understand this is a pre-launch application, not a credit approval, issued card or promise of worldwide use.</span></label>
              <label className={styles.checkbox}><input name="adult" type="checkbox" required /><span>I confirm that I am at least 18 years old. Any future issuer may apply additional age and eligibility requirements.</span></label>
              <label className={styles.checkbox}><input name="privacy" type="checkbox" required /><span>I have read the <Link href="/cards#program-details">program information</Link> and <Link href="/legal/privacy">privacy notice</Link>, and agree to my preferences and review history being recorded for this application.</span></label>
              <button className="ws-button ws-button-gold" type="submit">{busy ? "Submitting…" : "Submit pre-launch application"}<ArrowUpRight size={15} /></button>
            </fieldset>
          </form>
          <p className={styles.small}>No fee, credit check or balance deduction. Do not enter payment-card numbers, CVVs, PINs, bank details or identity documents.</p>
        </Panel>}
        {error && <Notice tone="error">{error}</Notice>}
        {r.error && <LoadState {...r} />}
      </div>
    </div>
  </div>}</TranslatedContent>;
}

type AdminResponse = { program: { message: string }; applications: CardApplication[]; total: number; page: number; pageSize: number };
export function AdminCards() {
  useDisplayLocale();
  const [query, setQuery] = useState(""), [search, setSearch] = useState(""), [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), ...(search ? { q: search } : {}), ...(status ? { status } : {}) });
  const r = useRemote<AdminResponse>(`/admin/card-applications?${params}`);
  const [selected, setSelected] = useState<CardApplication | null>(null), [decision, setDecision] = useState("UNDER_REVIEW"), [message, setMessage] = useState(""), [code, setCode] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (r.data) setSelected(old => old ? r.data!.applications.find(row => row.id === old.id) ?? null : null); }, [r.data]);
  function choose(application: CardApplication) { if (busy) return; setSelected(application); setDecision(application.status === "UNDER_REVIEW" ? "WAITLISTED" : "UNDER_REVIEW"); setMessage(""); setCode(""); setError(""); }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return; setBusy(true); setError("");
    try { const result = await api<{ application: CardApplication }>(`/admin/card-applications/${selected.id}/review`, { method: "POST", body: JSON.stringify({ status: decision, message, code, version: selected.version }) }); setSelected({ ...selected, ...result.application }); setDecision(result.application.status === "UNDER_REVIEW" ? "WAITLISTED" : "UNDER_REVIEW"); setCode(""); setMessage(""); void r.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Review could not be saved."); setCode(""); void r.reload(); }
    finally { setBusy(false); }
  }
  return <TranslatedContent>{<div className={styles.root}>
    <Notice>{r.data?.program.message ?? "Pre-launch review only. Administrator decisions cannot issue cards or approve credit."}</Notice>
    <Panel title="Card applications" eyebrow="PRELIMINARY REVIEW QUEUE" action={<button type="button" className="ws-button ws-button-small" disabled={busy} onClick={() => void r.reload()}><RefreshCw size={13} /> Refresh</button>}>
      <form className={styles.filters} onSubmit={event => { event.preventDefault(); if (busy) return; setSearch(query.trim()); setPage(1); setSelected(null); }}><div><Search size={15} /><input aria-label="Search card applicants" placeholder="Name or email" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} /></div><button className="ws-button ws-button-small" type="submit">Search</button><select aria-label="Filter application status" disabled={busy} value={status} onChange={event => { setStatus(event.target.value); setPage(1); setSelected(null); }}><option value="">All statuses</option>{Object.entries(cardStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></form>
      <LoadState {...r} />
      {r.data && <><p className={styles.small}>{r.data.total} matching application{r.data.total === 1 ? "" : "s"}. These are pre-launch expressions of interest.</p>{r.data.applications.length ? <div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>Applicant</th><th>Preferences</th><th>Residence</th><th>Status</th><th>Submitted</th><th /></tr></thead><tbody>{r.data.applications.map(application => <tr key={application.id}><td><strong><Verbatim>{application.user?.name}</Verbatim></strong><small><Verbatim>{application.user?.email}</Verbatim></small></td><td>{application.network === "VISA" ? "Visa" : "Mastercard"}<small>{application.format.toLowerCase()}</small></td><td><Verbatim>{application.country}</Verbatim></td><td><Status status={application.status} /></td><td><DateText value={application.submittedAt} /></td><td><button className="ws-button ws-button-small" type="button" disabled={busy} onClick={() => choose(application)} aria-label={`Review ${application.user?.name}`}>View & review</button></td></tr>)}</tbody></table></div> : <Empty icon={CreditCard} title="No matching applications">Submitted pre-launch card applications will appear here.</Empty>}<div className={styles.pagination}><button type="button" className="ws-button ws-button-small" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(r.data.total / r.data.pageSize))}</span><button type="button" className="ws-button ws-button-small" disabled={busy || page * r.data.pageSize >= r.data.total} onClick={() => setPage(value => value + 1)}>Next</button></div></>}
    </Panel>
    {selected && <Panel title={selected.user?.name ?? "Application details"} eyebrow={reference(selected)} action={<Status status={selected.status} />}>
      <dl className={styles.facts}><div><dt>Account email</dt><dd><Verbatim>{selected.user?.email}</Verbatim></dd></div><div><dt>Residence</dt><dd><Verbatim>{selected.country}</Verbatim></dd></div><div><dt>Preferences</dt><dd>{selected.network} / {selected.format}</dd></div><div><dt>Intended use</dt><dd>{selected.intendedUse.toLowerCase()}</dd></div><div><dt>Platform KYC</dt><dd>{selected.user?.kyc?.status ?? "Not submitted"}</dd></div><div><dt>Consent recorded</dt><dd>{selected.consentVersion} · <DateText value={selected.consentedAt} /></dd></div></dl>
      <p className={styles.small}>Platform identity review is not issuer underwriting. A waitlist decision does not establish credit eligibility or network approval.</p>
      {["SUBMITTED", "UNDER_REVIEW"].includes(selected.status) && <form className={styles.form} onSubmit={review}><fieldset disabled={busy}>
        <label>Preliminary outcome<select value={decision} onChange={event => setDecision(event.target.value)}>{selected.status !== "UNDER_REVIEW" && <option value="UNDER_REVIEW">Start preliminary review</option>}<option value="WAITLISTED">Add to pre-launch list</option><option value="DECLINED">Decline application</option></select></label>
        <label>Message to applicant<textarea minLength={10} maxLength={500} required rows={3} value={message} onChange={event => setMessage(event.target.value)} placeholder="Explain the preliminary outcome. Do not claim that a card or credit line is approved." /></label>
        <p className={styles.small}>This message is visible to the applicant. Do not enter identity numbers, bank details or other sensitive information.</p>
        <label>Your administrator authenticator code<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value)} /></label>
        <button type="submit" className="ws-button ws-button-gold">{busy ? "Saving…" : "Save preliminary review"}</button>
      </fieldset></form>}
      {error && <Notice tone="error">{error}</Notice>}
      {selected.reviewMessage && <div className={styles.reviewMessage}><strong>Latest review message</strong><p><Verbatim>{selected.reviewMessage}</Verbatim></p></div>}
      <History application={selected} />
    </Panel>}
  </div>}</TranslatedContent>;
}
