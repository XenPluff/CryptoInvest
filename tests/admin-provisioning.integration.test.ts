import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { promoteAdministrator } from "../server/admin-provisioning";

const connectionString = process.env.TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;

integration("operator administrator provisioning", () => {
  let db: PrismaClient;
  beforeAll(async () => {
    const target = new URL(connectionString!);
    if (!target.pathname.endsWith("_test") || (process.env.DATABASE_URL &&
      new URL(process.env.DATABASE_URL).pathname === target.pathname))
      throw new Error("A separate disposable *_test database is required.");
    const native = new pg.Client({ connectionString });
    await native.connect();
    try {
      const root = new URL("../prisma/migrations/", import.meta.url);
      for (const entry of (await readdir(root, { withFileTypes: true }))
        .filter(item => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        await native.query(await readFile(new URL(`${entry.name}/migration.sql`, root), "utf8"));
      }
    } finally { await native.end(); }
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }, 30000);
  afterAll(async () => { if (db) await db.$disconnect(); });

  async function account(options: { verified?: boolean; suspended?: boolean } = {}) {
    const id = randomUUID();
    return db.user.create({ data: {
      name: "Operator test", email: `${id}@example.test`, referralCode: id,
      passwordHash: "preserve-this-existing-hash",
      emailVerifiedAt: options.verified === false ? null : new Date(),
      suspended: options.suspended ?? false,
      twoFactorEnabled: true, twoFactorSecret: "preserve-encrypted-authenticator-secret",
    } });
  }

  it("preserves credentials and funds while revoking sessions and recording the role grant", async () => {
    const user = await account();
    await db.session.create({ data: {
      userId: user.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000),
    } });
    await db.token.create({ data: {
      userId: user.id, kind: "RESET_PASSWORD", tokenHash: randomUUID(),
      expiresAt: new Date(Date.now() + 60000),
    } });
    await db.ledgerEntry.create({ data: {
      userId: user.id, amountCents: 5000, kind: "TEST_FIXTURE", referenceId: randomUUID(),
    } });
    expect(await promoteAdministrator(db, ` ${user.email.toUpperCase()} `)).toEqual({ promoted: true });
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.role).toBe("ADMIN");
    expect(updated.passwordHash).toBe(user.passwordHash);
    expect(updated.twoFactorSecret).toBe(user.twoFactorSecret);
    expect(updated.twoFactorEnabled).toBe(user.twoFactorEnabled);
    expect(updated.emailVerifiedAt).toEqual(user.emailVerifiedAt);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    expect(await db.token.count({ where: { userId: user.id, usedAt: null } })).toBe(0);
    expect((await db.ledgerEntry.aggregate({ where: { userId: user.id }, _sum: { amountCents: true } }))._sum.amountCents).toBe(5000);
    expect(await db.auditLog.count({ where: { targetId: user.id, action: "ADMIN_ROLE_GRANTED" } })).toBe(1);
  });

  it("is idempotent and preserves sessions created after the first promotion", async () => {
    const user = await account();
    await promoteAdministrator(db, user.email);
    await db.session.create({ data: {
      userId: user.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000),
    } });
    expect(await promoteAdministrator(db, user.email)).toEqual({ promoted: false });
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(1);
    expect(await db.auditLog.count({ where: { targetId: user.id, action: "ADMIN_ROLE_GRANTED" } })).toBe(1);
  });

  it("serializes concurrent grants without duplicate role-change records", async () => {
    const user = await account();
    const results = await Promise.all([
      promoteAdministrator(db, user.email), promoteAdministrator(db, user.email),
    ]);
    expect(results.filter(result => result.promoted)).toHaveLength(1);
    expect(await db.auditLog.count({ where: { targetId: user.id, action: "ADMIN_ROLE_GRANTED" } })).toBe(1);
  });

  it.each([
    { verified: false, suspended: false }, { verified: true, suspended: true },
  ])("rejects ineligible accounts without changing their role", async options => {
    const user = await account(options);
    await expect(promoteAdministrator(db, user.email)).rejects.toThrow();
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("USER");
    expect(await db.auditLog.count({ where: { targetId: user.id } })).toBe(0);
  });

  it("does not create an account for an unknown address", async () => {
    const email = `${randomUUID()}@example.test`;
    await expect(promoteAdministrator(db, email)).rejects.toThrow("The account does not exist");
    expect(await db.user.findUnique({ where: { email } })).toBeNull();
  });

  it("rejects an invalid target before querying the database", async () => {
    await expect(promoteAdministrator(db, "invalid")).rejects.toThrow("Set ADMIN_EMAIL");
  });
});
