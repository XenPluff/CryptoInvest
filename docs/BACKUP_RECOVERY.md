# Backups and recovery

Open **Administration → Operations & backups** at `/admin/operations`. An active
administrator session with an enrolled authenticator is required. Saving an
encryption key, preparing an archive, and acknowledging an alert also require a
fresh authenticator code. Funding settings and receiving addresses are unchanged.

## First backup: no storage account needed

1. Select **Generate and download recovery key**. The browser creates a 3072-bit
   RSA-OAEP key pair and downloads `aureon-backup-recovery-key.pem`. The private key
   stays on that device; it is never submitted to the application or stored in
   its database, cookies, or browser local storage.
2. Save that file in a secure password manager/file vault, with a separate
   recovery copy. Confirm that you saved it, enter your authenticator code, and
   select **Save public encryption key**. Only the public key goes to AUREON.
   Refreshing before saving discards the generated in-memory keys.
3. Enter a current authenticator code and select **Download encrypted backup**.
   Confirm that the `.aureon` download finished. Keep the archive outside Render,
   separately from the private recovery key. Its SHA-256 checksum and encryption
   key fingerprint appear in backup history. The browser verifies the checksum
   before offering the download.

`PREPARED` records a generated download, not confirmed off-site storage. There is
no default recovery key and no way to recover a lost private key. Key replacement
is deliberately refused by the web endpoint; an operator must plan rotation,
retain old recovery keys, and audit any configuration change.

Also save the application's `KYC_ENCRYPTION_KEY` separately through a trusted
secret manager. It protects encrypted identity and authenticator data inside
the database. Keep deployment secrets and their recovery instructions outside
the database they protect. Never paste secrets or recovery keys into chat or
commit them to Git. Backups contain personal, authentication, and financial data.

## Daily private storage

The owner currently has **no storage account**. Automatic off-site backups stay
disabled until both encryption and storage are configured. Local temporary files
are removed after upload/download or failure; Render's temporary disk is not a
durable backup destination.

For Cloudflare R2:

1. Create a private R2 bucket. Leave public access and `r2.dev` disabled. Review
   the provider's current pricing and account requirements before activation.
2. Create an object read/write API token scoped only to that bucket.
3. Add the following to the existing Render service's secure Environment settings:

   | Setting | Value |
   | --- | --- |
   | `BACKUP_S3_BUCKET` | The private bucket name |
   | `BACKUP_S3_REGION` | `auto` |
   | `BACKUP_S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
   | `BACKUP_S3_ACCESS_KEY_ID` | The bucket-scoped access key ID |
   | `BACKUP_S3_SECRET_ACCESS_KEY` | The bucket-scoped secret access key |

4. Save/redeploy through Render. Confirm **Automatic off-site backups: Enabled**
   in Operations, then confirm an actual `SUCCEEDED` run. Configuration presence
   alone does not establish connectivity or a successful backup.
5. Configure a bucket lifecycle rule to expire `aureon/backups/` objects after
   30 days. The application does not delete bucket objects or silently configure
   retention on your behalf. Keep longer retention where your obligations need it.

Amazon S3 uses the same settings with its actual region; leave the endpoint
unset. Enable Block Public Access, use a dedicated private bucket, and grant the
application only `s3:PutObject` and `s3:GetObject` for
`arn:aws:s3:::<bucket>/aureon/backups/*`. Lifecycle administration uses a separate
operator permission. Endpoint overrides must use HTTPS without URL credentials.

The worker checks on startup and every 15 minutes, claiming one UTC date slot.
Missed days are not recreated; startup catches up with a current snapshot.
Database claims prevent duplicate daily runs across workers; failed runs retry
after 15 minutes, at most three times per UTC day. PostgreSQL advisory locks
serialize archive creation. The running service is needed for this scheduler;
an outage can delay backups. Coverage alerts flag missing verified uploads after
36 hours and failed/interrupted scheduled runs.

Each archive uses PostgreSQL 17 `pg_dump` custom format for the public schema,
with a repeatable-read exported snapshot. The encrypted manifest records every
public table's count and a streamed digest of ordered ledger records from that
same snapshot. Archives use a fresh AES-256-GCM key/nonce, RSA-OAEP-SHA256 key
wrapping, and authenticated format metadata. Plain database archives are never
written to disk while creating a backup. The archive limit is 512 MiB; larger
databases need a revised backup design. Successful off-site runs require an
actual upload followed by a complete read-back size and SHA-256 comparison.

## Verify a recovery

Use a trusted maintenance computer/environment with Node 22+, PostgreSQL 17
`pg_restore`, and this repository's dependencies. Do not upload the private key
through chat or the website. Obtain an archive from the private bucket/download
and its recorded checksum from authenticated backup history. Encryption protects
confidentiality; the separately recorded checksum also establishes which archive
you intended to restore. Do not restore untrusted substitute archives.

Create a separate **empty, disposable** PostgreSQL database named, for example,
`aureon_dr_restore_test`. Set `RESTORE_DATABASE_URL` securely to that database,
outside production mode. Then run:

```sh
npm run backup:verify-restore -- \
  --archive /secure/archive.aureon \
  --private-key /secure/aureon-backup-recovery-key.pem \
  --sha256 RECORDED_64_CHARACTER_SHA256 \
  --confirm-disposable-restore \
  --report /secure/restore-report.json
```

The tool verifies the checksum and GCM authentication before restoring. It
refuses production mode, the configured application database, the source
database name, destinations without the `_restore_test` suffix, and nonempty
destinations. It drops only the empty default `public` schema without CASCADE,
then uses a single-transaction restore without `--clean`. It checks every
public table count and the complete ledger digest, emits a verification report,
and removes temporary decrypted files even on failure. The target remains a
disposable database for inspection; remove it after review.

This tests recovery into a separate database. Production cutover still requires
an operator-controlled maintenance procedure, recovery of the application
encryption secrets, account/session review, application checks, and independent
financial reconciliation. There is no public or administrator HTTP endpoint to
overwrite production data. Schedule recurring drills and retain their reports.

## Recorded validation

Eight dedicated PostgreSQL integration checks passed using disposable databases,
including a real encrypted archive, an actual restore, all table counts and
ledger verification, incorrect checksums, occupied targets, authorization/TOTP,
concurrent daily claims, retry behavior, notification deduplication and recipient
eligibility. Storage transport tests reject missing, corrupted, or oversized
read-back objects. Browser tests verify that only a public key is transmitted.
Actual R2/S3 connectivity and a backup of production data are unverified until
the owner supplies storage and completes the recovery-kit setup.
