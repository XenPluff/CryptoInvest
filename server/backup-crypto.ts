import { createCipheriv, createDecipheriv, createHash, createPublicKey, privateDecrypt, publicEncrypt, randomBytes, constants } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Transform, type Readable } from "node:stream";

const magic = Buffer.from("AUREONBK1\n");
const tagBytes = 16;
const maxBytes = 512 * 1024 * 1024;
export type BackupManifest = { version: 1; database: string; createdAt: string; tables: Record<string, number>; ledgerHash: string };
export function validateBackupPublicKey(pem: string) {
  if (pem.length > 8192 || !pem.startsWith("-----BEGIN PUBLIC KEY-----")) throw new Error("Use an RSA public key in SPKI PEM format.");
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 3072)
    throw new Error("Use an RSA key with at least 3072 bits.");
  return { key, fingerprint: createHash("sha256").update(key.export({ format: "der", type: "spki" })).digest("hex") };
}
export async function fileDigest(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
/** Encrypts a consistent PostgreSQL archive without writing plaintext to disk. */
export async function encryptBackup(source: Readable, path: string, publicPem: string, manifest: BackupManifest) {
  const { key, fingerprint } = validateBackupPublicKey(publicPem);
  const secret = randomBytes(32);
  const iv = randomBytes(12);
  const wrappedKey = publicEncrypt({ key, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING }, secret);
  const header = Buffer.from(JSON.stringify({ version: 1, fingerprint, iv: iv.toString("base64"), wrappedKey: wrappedKey.toString("base64") }));
  const headerLength = Buffer.alloc(4); headerLength.writeUInt32BE(header.length);
  const authenticatedHeader = Buffer.concat([magic, headerLength, header]);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  cipher.setAAD(authenticatedHeader);
  secret.fill(0);
  const output = createWriteStream(path, { flags: "wx", mode: 0o600 });
  output.write(authenticatedHeader);
  const bodyManifest = Buffer.from(JSON.stringify(manifest));
  const manifestLength = Buffer.alloc(4); manifestLength.writeUInt32BE(bodyManifest.length);
  cipher.write(Buffer.concat([manifestLength, bodyManifest]));
  let bytes = authenticatedHeader.length;
  const bounded = new Transform({ transform(chunk, _encoding, done) {
    bytes += chunk.length;
    done(bytes > maxBytes ? new Error("Backup exceeds the configured 512 MiB limit.") : null, chunk);
  } });
  await pipeline(source, cipher, bounded, output, { end: false });
  await new Promise<void>((resolve, reject) => { output.once("error", reject); output.end(cipher.getAuthTag(), resolve); });
  return { fingerprint, sha256: await fileDigest(path), sizeBytes: (await stat(path)).size };
}

/** Authentication completes before any restore is attempted. Private keys stay operator-side. */
export async function decryptBackup(path: string, privatePem: string, archivePath: string): Promise<BackupManifest> {
  const file = await open(path, "r");
  try {
    const size = (await file.stat()).size;
    if (size > maxBytes + 16384 || size < magic.length + 4 + tagBytes) throw new Error("Invalid backup size.");
    const prefix = Buffer.alloc(magic.length + 4);
    await file.read(prefix, 0, prefix.length, 0);
    if (!prefix.subarray(0, magic.length).equals(magic)) throw new Error("Unsupported backup format.");
    const length = prefix.readUInt32BE(magic.length);
    if (length < 1 || length > 16384 || size <= prefix.length + length + tagBytes) throw new Error("Invalid backup header.");
    const rawHeader = Buffer.alloc(length); await file.read(rawHeader, 0, length, prefix.length);
    const header = JSON.parse(rawHeader.toString());
    if (header.version !== 1 || !/^[a-f0-9]{64}$/.test(header.fingerprint)) throw new Error("Invalid backup header.");
    const secret = privateDecrypt({ key: privatePem, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(header.wrappedKey, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", secret, Buffer.from(header.iv, "base64"));
    secret.fill(0);
    decipher.setAAD(Buffer.concat([prefix, rawHeader]));
    const tag = Buffer.alloc(tagBytes); await file.read(tag, 0, tagBytes, size - tagBytes); decipher.setAuthTag(tag);
    let manifest: BackupManifest | undefined;
    let pending = Buffer.alloc(0);
    let manifestLength = -1;
    const stripManifest = new Transform({ transform(chunk, _encoding, done) {
      if (manifest) return done(null, chunk);
      pending = Buffer.concat([pending, chunk]);
      if (manifestLength < 0 && pending.length >= 4) {
        manifestLength = pending.readUInt32BE(0);
        if (manifestLength > 1024 * 1024 || manifestLength < 2) return done(new Error("Invalid backup manifest."));
      }
      if (manifestLength >= 0 && pending.length >= manifestLength + 4) {
        try { manifest = JSON.parse(pending.subarray(4, 4 + manifestLength).toString()); }
        catch { return done(new Error("Invalid backup manifest.")); }
        const remainder = pending.subarray(4 + manifestLength); pending = Buffer.alloc(0); return done(null, remainder);
      }
      done();
    } });
    await pipeline(createReadStream(path, { start: prefix.length + length, end: size - tagBytes - 1 }), decipher, stripManifest, createWriteStream(archivePath, { flags: "wx", mode: 0o600 }));
    if (!manifest || manifest.version !== 1 || typeof manifest.database !== "string" || !manifest.tables || !/^[a-f0-9]{64}$/.test(manifest.ledgerHash)) throw new Error("Invalid backup manifest.");
    return manifest;
  } finally { await file.close(); }
}
