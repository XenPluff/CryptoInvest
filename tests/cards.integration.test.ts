import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import pg from "pg";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import type { PrismaClient } from "@prisma/client";

const connectionString = process.env.TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;
integration("pre-launch card applications", () => {
  let db: PrismaClient, native: pg.Client, server: Server, base: string;
  const accounts: Record<string, { id: string; email: string; cookie: string }> = {};
  const secret = authenticator.generateSecret();
  const code = () => authenticator.generate(secret);
  const input = () => ({ network: "VISA", format: "PHYSICAL", country: "United Kingdom", intendedUse: "PERSONAL", consentVersion: "card-prelaunch-v1", acknowledgePrelaunch: true, acknowledgePrivacy: true, confirmAdult: true });
  const review = (version: number, status = "WAITLISTED") => ({ status, version, message: "Preliminary review completed; this does not issue a card or approve credit.", code: code() });
  async function request(path: string, who = "primary", method = "GET", body?: unknown, origin = "http://localhost:3000") {
    return fetch(base + "/api" + path, { method, headers: { Origin: origin, "Content-Type": "application/json", Cookie: accounts[who]?.cookie ?? "" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  beforeAll(async () => {
    const target = new URL(connectionString!);
    if (!target.pathname.endsWith("_test") || target.pathname === new URL(process.env.DATABASE_URL!).pathname) throw new Error("Separate disposable database required.");
    process.env.DATABASE_URL = connectionString; process.env.NODE_ENV = "test"; process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.JWT_SECRET = randomBytes(48).toString("hex"); process.env.KYC_ENCRYPTION_KEY = randomBytes(32).toString("hex"); process.env.FUNDING_ENABLED = "false";
    native = new pg.Client({ connectionString }); await native.connect();
    const root = new URL("../prisma/migrations/", import.meta.url);
    for (const entry of (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) await native.query(await readFile(new URL(`${entry.name}/migration.sql`, root), "utf8"));
    db = (await import("../server/db")).prisma;
    const encrypt = (await import("../server/crypto")).encrypt;
    const password = "Card-fixture-password-348!", passwordHash = await bcrypt.hash(password, 4);
    for (const name of ["primary", "other", "validation", "race", "unverified", "admin"]) {
      const user = await db.user.create({ data: { name: `Card ${name}`, email: `${randomUUID()}@example.test`, passwordHash, referralCode: randomUUID(), emailVerifiedAt: name === "unverified" ? null : new Date(), role: name === "admin" ? "ADMIN" : "USER", twoFactorEnabled: name === "admin", twoFactorSecret: name === "admin" ? encrypt(secret) : null } });
      accounts[name] = { id: user.id, email: user.email, cookie: "" };
    }
    server = createServer((await import("../server/app")).app); await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); base = `http://127.0.0.1:${(server.address() as any).port}`;
    for (const account of Object.values(accounts)) {
      const response = await fetch(base + "/api/auth/login", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password, ...(account.id === accounts.admin.id ? { code: code() } : {}) }) });
      expect(response.status).toBe(200); account.cookie = response.headers.get("set-cookie")!.split(";")[0];
    }
  }, 30000);
  afterAll(async () => { server?.closeAllConnections(); if (server) await new Promise<void>(resolve => server.close(() => resolve())); await native?.end(); if (db) await db.$disconnect(); }, 30000);

  it("requires authenticated ownership, verified email, admin role and same origin", async () => {
    expect((await request("/cards", "anonymous")).status).toBe(401);
    expect((await request("/admin/card-applications", "primary")).status).toBe(403);
    expect((await request("/cards/applications", "unverified", "POST", input())).status).toBe(403);
    expect((await request("/cards/applications", "primary", "POST", input(), "https://attacker.example")).status).toBe(403);
    const response = await (await request("/cards")).json();
    expect(response.application).toBeNull(); expect(response.program.phase).toBe("PRELAUNCH"); expect(response.program.issuingEnabled).toBe(false); expect(response.program.paymentsEnabled).toBe(false); expect(response.program.supportedCountries).toEqual([]);
  });
  it("rejects unsupported issuance fields, missing disclosures and inappropriate country data", async () => {
    for (const payload of [{ ...input(), cardNumber: "4111111111111111" }, { ...input(), acknowledgePrelaunch: false }, { ...input(), acknowledgePrivacy: false }, { ...input(), confirmAdult: false }, { ...input(), country: "123456789" }]) expect((await request("/cards/applications", "validation", "POST", payload)).status).toBe(400);
    expect(await db.cardApplication.count({ where: { userId: accounts.validation.id } })).toBe(0);
  });
  it("atomically admits only one concurrent application and never posts funds or queues email", async () => {
    const responses = await Promise.all([request("/cards/applications", "primary", "POST", input()), request("/cards/applications", "primary", "POST", input())]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    const application = await db.cardApplication.findUniqueOrThrow({ where: { userId: accounts.primary.id } });
    expect(application.status).toBe("SUBMITTED"); expect(application.version).toBe(1); expect(application.consentVersion).toBe("card-prelaunch-v1");
    expect(await db.cardApplicationEvent.count({ where: { applicationId: application.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "CARD_APPLICATION_SUBMITTED", targetId: application.id } })).toBe(1);
    expect(await db.ledgerEntry.count()).toBe(0); expect(await db.transaction.count()).toBe(0); expect(await db.emailOutbox.count()).toBe(0);
    expect(await db.notification.count({ where: { userId: accounts.admin.id, title: "New card application" } })).toBe(1);
  });
  it("keeps applicant records private and prevents another investor withdrawing them", async () => {
    const own = await (await request("/cards", "primary")).json(); expect(own.application.events).toHaveLength(1); expect(own.application.userId).toBeUndefined(); expect(own.application.events[0].actorId).toBeUndefined();
    expect((await (await request("/cards", "other")).json()).application).toBeNull();
    expect((await request(`/cards/applications/${own.application.id}/withdraw`, "other", "POST", { version: own.application.version })).status).toBe(404);
    expect((await request(`/cards/applications/${own.application.id}/withdraw`, "primary", "POST", { version: 999 })).status).toBe(409);
  });
  it("requires fresh administrator TOTP and refuses card issuance or self-review", async () => {
    const application = await db.cardApplication.findUniqueOrThrow({ where: { userId: accounts.primary.id } });
    const path = `/admin/card-applications/${application.id}/review`;
    expect((await request(path, "admin", "POST", { ...review(1), code: "" })).status).toBe(403);
    const wrong = (Number(code()) + 123456) % 1000000;
    expect((await request(path, "admin", "POST", { ...review(1), code: String(wrong).padStart(6, "0") })).status).toBe(403);
    expect((await request(path, "admin", "POST", review(1, "ISSUED"))).status).toBe(400);
    expect((await request(path, "admin", "POST", { ...review(1), creditLimit: 100000 })).status).toBe(400);
    const ownResponse = await request("/cards/applications", "admin", "POST", input()); expect(ownResponse.status).toBe(201); const own = await ownResponse.json();
    expect((await request(`/admin/card-applications/${own.application.id}/review`, "admin", "POST", review(1))).status).toBe(403);
  });
  it("records a preliminary review with history and rejects stale or duplicate decisions", async () => {
    const application = await db.cardApplication.findUniqueOrThrow({ where: { userId: accounts.primary.id } }); const path = `/admin/card-applications/${application.id}/review`;
    expect((await request(path, "admin", "POST", review(1, "UNDER_REVIEW"))).status).toBe(200);
    expect((await request(path, "admin", "POST", review(1))).status).toBe(409);
    expect((await request(path, "admin", "POST", review(2))).status).toBe(200);
    expect((await request(path, "admin", "POST", review(3, "DECLINED"))).status).toBe(409);
    const own = await (await request("/cards", "primary")).json(); expect(own.application.status).toBe("WAITLISTED"); expect(own.application.events).toHaveLength(3); expect(own.program.issuingEnabled).toBe(false);
    expect(await db.auditLog.count({ where: { action: "CARD_APPLICATION_REVIEWED", targetId: application.id } })).toBe(2);
  });
  it("withdraws and resubmits while retaining the full prior status history", async () => {
    const application = await db.cardApplication.findUniqueOrThrow({ where: { userId: accounts.primary.id } });
    expect((await request(`/cards/applications/${application.id}/withdraw`, "primary", "POST", { version: application.version })).status).toBe(200);
    const response = await request("/cards/applications", "primary", "POST", { ...input(), network: "MASTERCARD", format: "VIRTUAL" }); expect(response.status).toBe(201); const result = await response.json();
    expect(result.application.id).toBe(application.id); expect(result.application.status).toBe("SUBMITTED"); expect(result.application.version).toBe(5); expect(result.application.network).toBe("MASTERCARD"); expect(result.application.events).toHaveLength(5);
    expect(await db.cardApplication.count({ where: { userId: accounts.primary.id } })).toBe(1);
  });
  it("serializes a review racing a withdrawal without overwriting either decision", async () => {
    const created = await request("/cards/applications", "race", "POST", input()); const application = (await created.json()).application;
    const responses = await Promise.all([request(`/cards/applications/${application.id}/withdraw`, "race", "POST", { version: 1 }), request(`/admin/card-applications/${application.id}/review`, "admin", "POST", review(1))]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect(await db.cardApplicationEvent.count({ where: { applicationId: application.id } })).toBe(2);
    expect((await db.cardApplication.findUniqueOrThrow({ where: { id: application.id } })).version).toBe(2);
  });
  it("supports paginated admin filtering without exposing authentication material", async () => {
    const rows = await request(`/admin/card-applications?q=${encodeURIComponent(accounts.primary.email)}&status=SUBMITTED`, "admin"); expect(rows.status).toBe(200); const body = await rows.json(); expect(body.total).toBe(1); expect(body.applications[0].user.email).toBe(accounts.primary.email); expect(body.pageSize).toBe(25);
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|twoFactorSecret|tokenHash|encryptedPayload/);
    expect((await request("/admin/card-applications?status=ISSUED", "admin")).status).toBe(400);
    expect((await request("/admin/card-applications?page=0", "admin")).status).toBe(400);
    const second = await (await request("/admin/card-applications?page=2", "admin")).json(); expect(second.applications).toEqual([]); expect(second.total).toBeGreaterThan(0);
    expect(await db.ledgerEntry.count()).toBe(0); expect(await db.emailOutbox.count()).toBe(0);
  });
});
