"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, Check, Download, ExternalLink, KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, DateText, Empty, LoadState, Notice, Panel, useRemote } from "./shared";
import styles from "./operations.module.css";

type Alert = { id: string; severity: string; title: string; message: string; actionPath: string; occurrences: number; openedAt: string; resolvedAt: string | null; acknowledgedAt: string | null };
type Backup = { id: string; status: string; storage: string; sha256: string | null; sizeBytes: number | null; error: string | null; startedAt: string; finishedAt: string | null; keyFingerprint: string };
type OperationsData = { alerts: Alert[]; backups: Backup[]; latestVerifiedBackup?: Backup | null; backup: { encryptionConfigured: boolean; keyFingerprint: string | null; storageConfigured: boolean; missingStorageSettings: string[]; validStorageEndpoint: boolean; automaticEnabled: boolean; schedule: string; retention: string } };
function download(content: Blob, filename: string) {
  const url = URL.createObjectURL(content); const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function pem(bytes: ArrayBuffer, label: string) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----\n`;
}
export function Operations() {
  useDisplayLocale();
  const remote = useRemote<OperationsData>("/admin/operations");
  const [code, setCode] = useState(""); const [busy, setBusy] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState(""); const [privateKey, setPrivateKey] = useState("");
  const [savedKey, setSavedKey] = useState(false); const [history, setHistory] = useState(false);
  useEffect(() => { const timer = setInterval(() => void remote.reload(), 60000); return () => clearInterval(timer); }, [remote.reload]);
  async function action(name: string, operation: () => Promise<void>) {
    if (busy) return; setBusy(name); setError(""); setMessage("");
    try { await operation(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The operation could not complete."); }
    finally { setBusy(""); }
  }
  async function generateKey() {
    await action("generate", async () => {
      const keys = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
      const [publicBytes, privateBytes] = await Promise.all([crypto.subtle.exportKey("spki", keys.publicKey), crypto.subtle.exportKey("pkcs8", keys.privateKey)]);
      const recovery = pem(privateBytes, "PRIVATE KEY");
      setPublicKey(pem(publicBytes, "PUBLIC KEY")); setPrivateKey(recovery); setSavedKey(false);
      download(new Blob([recovery], { type: "application/x-pem-file" }), "aureon-backup-recovery-key.pem");
      setMessage("Recovery key generated on your device. Save the downloaded file somewhere private, separate from backup archives. The private key is never sent to AUREON.");
    });
  }
  async function saveKey() {
    await action("save-key", async () => {
      await api("/admin/operations/backup-key", { method: "POST", body: JSON.stringify({ code, publicKey, recoveryKeySaved: savedKey }) });
      setPrivateKey(""); setPublicKey(""); setCode(""); setSavedKey(false);
      setMessage("Backup encryption is configured. Keep your recovery key: AUREON cannot recover it for you."); await remote.reload();
    });
  }
  async function downloadBackup() {
    await action("backup", async () => {
      const response = await fetch("/api/admin/operations/backups/download", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "The encrypted backup could not be prepared."); }
      const blob = await response.blob();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())), value => value.toString(16).padStart(2, "0")).join("");
      if (hash !== response.headers.get("X-Backup-SHA256")) throw new Error("Backup checksum did not match. Request a new archive.");
      download(blob, `aureon-backup-${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.aureon`);
      setCode(""); setMessage("Encrypted archive prepared and checksum verified. Save the download outside Render. Its checksum and encryption-key fingerprint are recorded below.");
      await remote.reload();
    });
  }
  if (!remote.data) return <TranslatedContent>{<LoadState {...remote} />}</TranslatedContent>;
  const { alerts, backups, backup } = remote.data;
  const active = alerts.filter(alert => !alert.resolvedAt);
  const recentUpload = remote.data.latestVerifiedBackup;
  const readyCode = /^\d{6}$/.test(code);
  return <TranslatedContent>{<div className={styles.root}>
    <div className={styles.intro}><div><span className="ws-eyebrow">CONTINUITY & OVERSIGHT</span><h2>Keep your operations in view.</h2><p>Review alerts, protect your records, and prepare for recovery.</p></div><button className="ws-button ws-button-small" onClick={() => void remote.reload()} disabled={remote.loading}><RefreshCw size={14} />Refresh</button></div>
    {remote.error && <Notice tone="error">{remote.error}</Notice>}{error && <Notice tone="error">{error}</Notice>}{message && <Notice>{message}</Notice>}
    <div className={styles.summary}>
      <div><span>Open alerts</span><strong>{active.length}</strong><small>{active.filter(alert => alert.severity === "CRITICAL").length} critical conditions</small></div>
      <div><span>Backup encryption</span><strong>{backup.encryptionConfigured ? "Configured" : "Needs setup"}</strong><small>Private recovery key stays with you</small></div>
      <div><span>Automatic off-site backups</span><strong>{backup.automaticEnabled ? "Enabled" : "Not enabled"}</strong><small>{backup.automaticEnabled ? "Daily, with startup catch-up" : "Encryption and private storage required"}</small></div>
      <div><span>Last verified upload</span><strong>{recentUpload?.finishedAt ? <DateText value={recentUpload.finishedAt} /> : "None recorded"}</strong><small>Manual downloads are listed separately</small></div>
    </div>
    <Panel title="Operational alerts" eyebrow="CHECKED EVERY MINUTE" action={<div className={styles.filters}><button aria-pressed={!history} onClick={() => setHistory(false)}>Open</button><button aria-pressed={history} onClick={() => setHistory(true)}>Resolved</button></div>}>
      <p className={styles.help}>New conditions and critical escalations notify active, verified administrators in the workspace and email queue. Unacknowledged conditions receive daily reminders. An email outage can delay email notices.</p>
      {(history ? alerts.filter(alert => alert.resolvedAt) : active).map(alert => <article className={styles.alert} key={alert.id}>
        <span className={`${styles.severity} ${alert.severity === "CRITICAL" ? styles.critical : ""}`}><BellRing size={16} />{alert.severity}</span><div><h3>{alert.title}</h3><p>{alert.message}</p><small>Opened <DateText value={alert.openedAt} />{alert.acknowledgedAt ? " · Acknowledged" : ""}{alert.resolvedAt ? " · Resolved" : ""}</small><div className={styles.alertActions}><Link href={alert.actionPath}>Review details <ExternalLink size={12} /></Link>{!alert.resolvedAt && !alert.acknowledgedAt && <button className="ws-text-button" disabled={!readyCode || Boolean(busy)} onClick={() => void action(alert.id, async () => { await api(`/admin/operations/alerts/${alert.id}/acknowledge`, { method: "POST", body: JSON.stringify({ code }) }); setCode(""); setMessage("Alert acknowledged. Monitoring continues until the condition clears."); await remote.reload(); })}><Check size={13} />Acknowledge</button>}</div></div>
      </article>)}
      {!(history ? alerts.some(alert => alert.resolvedAt) : active.length) && <Empty icon={ShieldCheck} title={history ? "No resolved alerts recorded" : "No open operational alerts"}>Monitoring checks pending reviews, email delivery, repeated failed sign-ins, and backup coverage.</Empty>}
    </Panel>
    <div className={styles.columns}>
      <Panel title="Backups & recovery" eyebrow="ENCRYPTED BEFORE STORAGE">
        <p className={styles.help}>Archives contain a consistent PostgreSQL snapshot and financial-ledger verification data. Only your private recovery key can decrypt them. Keep it separate from the archives.</p>
        {!backup.encryptionConfigured ? <div className={styles.setup}>
          <strong>1. Create your recovery kit</strong><p>Your browser generates the key pair. AUREON stores only the public encryption key.</p>
          {!publicKey ? <button className="ws-button" disabled={Boolean(busy)} onClick={() => void generateKey()}>{busy === "generate" ? <LoaderCircle size={15} className="ws-spin" /> : <KeyRound size={15} />}Generate and download recovery key</button> : <>
            <button className="ws-button ws-button-small" onClick={() => download(new Blob([privateKey], { type: "application/x-pem-file" }), "aureon-backup-recovery-key.pem")}><Download size={14} />Download recovery key again</button>
            <label className={styles.checkbox}><input type="checkbox" checked={savedKey} onChange={event => setSavedKey(event.target.checked)} />I saved the recovery key securely and understand it cannot be recovered by AUREON.</label>
            <button className="ws-button ws-button-gold" disabled={!savedKey || !readyCode || Boolean(busy)} onClick={() => void saveKey()}>Save public encryption key</button>
          </>}
        </div> : <div className={styles.setup}><strong><ShieldCheck size={15} /> Encryption ready</strong><span className={styles.label}>KEY FINGERPRINT · SHA-256</span><code>{backup.keyFingerprint}</code><button className="ws-button ws-button-gold" disabled={!readyCode || Boolean(busy)} onClick={() => void downloadBackup()}>{busy === "backup" ? <LoaderCircle size={15} className="ws-spin" /> : <Download size={15} />}{busy === "backup" ? "Preparing encrypted archive…" : "Download encrypted backup"}</button><p>A prepared download is not proof that you saved it off-site. Check that the file finished downloading.</p></div>}
        <div className={styles.setup}><strong>2. Connect private off-site storage</strong><p>{backup.storageConfigured ? "Storage settings are present. The first uploaded archive must pass a read-back checksum check before it is recorded as successful." : "Automatic backups are not enabled. Create a private S3 or Cloudflare R2 bucket, then add these settings through Render’s secure environment settings."}</p>{!backup.storageConfigured && <code>BACKUP_S3_BUCKET<br />BACKUP_S3_REGION<br />BACKUP_S3_ACCESS_KEY_ID<br />BACKUP_S3_SECRET_ACCESS_KEY<br />BACKUP_S3_ENDPOINT (for R2)</code>}{!backup.validStorageEndpoint && <Notice tone="error">The configured storage endpoint must be a valid HTTPS URL.</Notice>}<p>Keep the bucket private and configure a 30-day lifecycle for <code>aureon/backups/</code>. Credentials never belong in chat or source code.</p></div>
        <div className={styles.setup}><strong>3. Test a recovery</strong><p>The operator restore tool checks the archive checksum, restores into an empty disposable database, and compares every table count and the financial ledger. It refuses to overwrite the application database.</p><p>Keep a separate secure copy of the application encryption secrets too; database backups alone cannot recover encrypted KYC or authenticator data. A successful backup does not establish a successful restore drill.</p><a href="https://github.com/XenPluff/CryptoInvest/blob/codex/aureon-render-preview/docs/BACKUP_RECOVERY.md" target="_blank" rel="noreferrer">Open the recovery guide <ExternalLink size={13} /></a></div>
      </Panel>
      <div className={styles.right}>
        <Panel title="Operator verification" eyebrow="REQUIRED FOR SENSITIVE ACTIONS"><label className={styles.codeLabel} htmlFor="ops-code">Authenticator code</label><input id="ops-code" className={styles.code} value={code} onChange={event => setCode(event.target.value)} type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="6-digit code" /><p className={styles.help}>Enter your current code before acknowledging an alert, saving the public key, or downloading a backup.</p></Panel>
        <Panel title="Independent availability checks" eyebrow="OUTSIDE THE WEBSITE"><p className={styles.help}>GitHub Actions checks public website/database health and email readiness every five minutes on a scheduled basis. GitHub may delay scheduled runs. A failed check opens one repository issue; recovery closes it.</p><a className={styles.external} href="https://github.com/XenPluff/CryptoInvest/actions/workflows/uptime.yml" target="_blank" rel="noreferrer">View monitor runs <ExternalLink size={13} /></a><p className={styles.help}>Enable repository notifications in GitHub to receive those alerts by email. This check runs independently of Render and does not use investor credentials.</p></Panel>
      </div>
    </div>
    <Panel title="Backup history" eyebrow="ACTUAL RECORDED RUNS"><div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>Started</th><th>Destination</th><th>Result</th><th>Size</th><th>Verification</th></tr></thead><tbody>{backups.map(run => <tr key={run.id}><td><DateText value={run.startedAt} /><small>{new Date(run.startedAt).toLocaleTimeString()}</small></td><td>{run.storage === "S3" ? "Private storage" : "Manual download"}</td><td><Badge value={run.status} />{run.error && <small>{run.error}</small>}</td><td>{run.sizeBytes === null ? "—" : `${(run.sizeBytes / 1024).toFixed(1)} KiB`}</td><td>{run.sha256 ? <details><summary>Checksum & key</summary><div className={styles.hash}><span>ARCHIVE SHA-256</span><code>{run.sha256}</code><span>ENCRYPTION KEY</span><code>{run.keyFingerprint}</code></div></details> : "Not completed"}</td></tr>)}</tbody></table></div>{!backups.length && <p className={styles.help}>No backup runs recorded. Create your recovery kit to get started.</p>}<p className={styles.help}>PREPARED means an encrypted download was generated. SUCCEEDED means an off-site upload was retrieved and its checksum matched.</p></Panel>
  </div>}</TranslatedContent>;
}
