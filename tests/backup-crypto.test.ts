import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { encryptBackup, decryptBackup, validateBackupPublicKey } from "../server/backup-crypto";
import { storageSettings } from "../server/backups";

const pair = generateKeyPairSync("rsa", { modulusLength: 3072, publicKeyEncoding: { format: "pem", type: "spki" }, privateKeyEncoding: { format: "pem", type: "pkcs8" } });
const manifest = { version: 1 as const, database: "source", createdAt: "2026-10-20T00:00:00Z", tables: { LedgerEntry: 1 }, ledgerHash: "a".repeat(64) };
describe("encrypted backup archives", () => {
  let directory: string;
  beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), "aureon-crypto-test-")); });
  afterAll(async () => { await rm(directory, { recursive: true, force: true }); });
  it("restores exact binary content and metadata without exposing the original bytes", async () => {
    const path = join(directory, "valid.aureon"); const archive = join(directory, "valid.dump");
    const plaintext = Buffer.from("PGDMP\0Sensitive account and ledger test data\0");
    const result = await encryptBackup(Readable.from([plaintext]), path, pair.publicKey, manifest);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/); expect(result.fingerprint).toHaveLength(64);
    expect((await readFile(path)).includes(plaintext)).toBe(false);
    expect(await decryptBackup(path, pair.privateKey, archive)).toEqual(manifest);
    expect(await readFile(archive)).toEqual(plaintext);
  });
  it.each(["header", "ciphertext", "tag"])("rejects altered %s before a restore can start", async part => {
    const path = join(directory, `${part}.aureon`);
    await encryptBackup(Readable.from([Buffer.from("PGDMP sensitive fixture")]), path, pair.publicKey, manifest);
    const bytes = await readFile(path);
    const offset = part === "header" ? 1 : part === "tag" ? bytes.length - 1 : bytes.length - 20;
    bytes[offset] ^= 1; await writeFile(path, bytes);
    await expect(decryptBackup(path, pair.privateKey, join(directory, `${part}.dump`))).rejects.toThrow();
  });
  it("rejects a different recovery key", async () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 3072, privateKeyEncoding: { format: "pem", type: "pkcs8" } });
    await expect(decryptBackup(join(directory, "valid.aureon"), other.privateKey, join(directory, "wrong-key.dump"))).rejects.toThrow();
  });
  it("rejects weak, private, and unsupported encryption keys", () => {
    const weak = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { format: "pem", type: "spki" } });
    expect(() => validateBackupPublicKey(weak.publicKey)).toThrow();
    expect(() => validateBackupPublicKey(pair.privateKey)).toThrow();
    expect(() => validateBackupPublicKey("invalid")).toThrow();
  });
  it("keeps scheduling disabled for missing credentials or insecure storage endpoints", () => {
    expect(storageSettings({}).configured).toBe(false);
    const settings = { BACKUP_S3_BUCKET: "private-bucket", BACKUP_S3_REGION: "auto", BACKUP_S3_ACCESS_KEY_ID: "fixture", BACKUP_S3_SECRET_ACCESS_KEY: "fixture" };
    expect(storageSettings(settings).configured).toBe(true);
    for (const endpoint of ["http://storage.example", "https://user:secret@storage.example", "https://storage.example/?token=secret", "invalid"]) expect(storageSettings({ ...settings, BACKUP_S3_ENDPOINT: endpoint }).configured).toBe(false);
  });
});
