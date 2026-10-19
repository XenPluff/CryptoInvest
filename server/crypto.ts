import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { config } from "./config";

const context = Buffer.from("aureon:encrypted-data:v1", "utf8");

/** Versioned, authenticated encryption for KYC data and TOTP secrets. */
export function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", config.encryptionKey, iv);
  cipher.setAAD(context);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decrypt(value: string): string {
  const [version, ivText, tagText, dataText, extra] = value.split(".");
  if (
    version !== "v1" ||
    !ivText ||
    !tagText ||
    dataText === undefined ||
    extra !== undefined
  ) {
    throw new Error("Unsupported encrypted data format.");
  }
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  if (iv.length !== 12 || tag.length !== 16)
    throw new Error("Invalid encrypted data.");
  const decipher = createDecipheriv("aes-256-gcm", config.encryptionKey, iv);
  decipher.setAAD(context);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(dataText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function tokenHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}
