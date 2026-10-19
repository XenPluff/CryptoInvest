/** Apply the checked-in PostgreSQL migrations atomically when native Prisma CLI engines are unavailable. */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock(738190218)");
  await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0
 )`);
  const root = resolve(import.meta.dirname, "../prisma/migrations");
  const names = (await readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const name of names) {
    const sql = await readFile(resolve(root, name, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query(
      'SELECT checksum,finished_at,rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1 AND rolled_back_at IS NULL',
      [name],
    );
    if (existing.rows.length) {
      if (!existing.rows[0].finished_at)
        throw new Error(
          `Migration ${name} has an unresolved failed application. Reconcile it before continuing.`,
        );
      if (existing.rows[0].checksum !== checksum)
        throw new Error(
          `Applied migration ${name} changed. Refusing to rewrite history.`,
        );
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,now(),1)',
        [randomUUID(), checksum, name],
      );
      await client.query("COMMIT");
      console.log(`Applied migration ${name}.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  console.log("Database migrations are current.");
} finally {
  await client.end();
}
