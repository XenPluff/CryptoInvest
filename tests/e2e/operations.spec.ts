import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

async function operationsPage(page: Page, configured = false) {
  const requests: { path: string; body: any }[] = [];
  const data = {
    alerts: [{ id: "pending-test", severity: "INFO", title: "Deposits awaiting review", message: "2 pending requests require an administrator decision.", actionPath: "/admin/deposits", occurrences: 2, openedAt: "2026-10-20T12:00:00Z", resolvedAt: null, acknowledgedAt: null as string | null }],
    backups: [] as any[],
    backup: { encryptionConfigured: configured, keyFingerprint: configured ? "a".repeat(64) : null as string | null, storageConfigured: false, missingStorageSettings: ["BACKUP_S3_BUCKET"], validStorageEndpoint: true, automaticEnabled: false, schedule: "Daily", retention: "30 days" },
  };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { id: "browser-only", name: "Operations Review", role: "ADMIN", email: "fixture@example.test", twoFactorEnabled: true } } });
    if (path === "/api/notifications") return route.fulfill({ json: { notifications: [] } });
    if (path === "/api/admin/operations" && route.request().method() === "GET") return route.fulfill({ json: data });
    const body = route.request().postDataJSON(); requests.push({ path, body });
    if (path.endsWith("/backup-key")) {
      data.backup.encryptionConfigured = true; data.backup.keyFingerprint = "a".repeat(64);
      return route.fulfill({ json: { fingerprint: "a".repeat(64) } });
    }
    if (path.endsWith("/acknowledge")) { data.alerts[0].acknowledgedAt = "2026-10-20T12:05:00Z"; return route.fulfill({ json: { message: "Acknowledged" } }); }
    if (path.endsWith("/backups/download")) {
      const bytes = Buffer.from("AUREONBK1\nEncrypted browser fixture only");
      data.backups.unshift({ id: "fixture-backup", status: "PREPARED", storage: "DOWNLOAD", sha256: createHash("sha256").update(bytes).digest("hex"), sizeBytes: bytes.length, keyFingerprint: "a".repeat(64), startedAt: "2026-10-20T12:00:00Z", finishedAt: "2026-10-20T12:01:00Z" });
      return route.fulfill({ headers: { "Content-Type": "application/octet-stream", "X-Backup-SHA256": data.backups[0].sha256 }, body: bytes });
    }
    throw new Error(`Unexpected operations endpoint: ${path}`);
  });
  await page.goto("/admin/operations");
  await expect(page.getByRole("heading", { name: "Keep your operations in view." })).toBeVisible();
  return requests;
}
test("recovery key is generated and downloaded locally while only its public key is saved", async ({ page }) => {
  const requests = await operationsPage(page);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate and download recovery key" }).click();
  const recovery = await downloadEvent;
  const privateKey = await readFile((await recovery.path())!, "utf8");
  expect(privateKey).toContain("-----BEGIN PRIVATE KEY-----");
  const save = page.getByRole("button", { name: "Save public encryption key" });
  await expect(save).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(save).toBeDisabled();
  await page.getByLabel("Authenticator code", { exact: true }).fill("123456");
  await save.click();
  await expect(page.getByRole("button", { name: "Download encrypted backup" })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].body.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
  expect(requests[0].body.recoveryKeySaved).toBe(true);
  expect(JSON.stringify(requests)).not.toContain("PRIVATE KEY");
  expect(JSON.stringify(requests)).not.toContain(privateKey);
  await expect(page.getByText("Not enabled", { exact: true })).toBeVisible();
});
test("backup download verifies its checksum and shows prepared separately from off-site success", async ({ page }) => {
  const requests = await operationsPage(page, true);
  await expect(page.getByRole("button", { name: "Download encrypted backup" })).toBeDisabled();
  await page.getByLabel("Authenticator code", { exact: true }).fill("123456");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download encrypted backup" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.aureon$/);
  await expect(page.locator("tbody tr")).toContainText("PREPARED");
  await expect(page.getByText("None recorded", { exact: true })).toBeVisible();
  expect(requests[0].body).toEqual({ code: "123456" });
});
test("acknowledgement requires a code and does not hide an open condition", async ({ page }) => {
  await operationsPage(page, true);
  await expect(page.getByRole("button", { name: "Acknowledge", exact: true })).toBeDisabled();
  await page.getByLabel("Authenticator code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(page.getByText("Opened", { exact: false }).filter({ hasText: "Acknowledged" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deposits awaiting review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Acknowledge", exact: true })).toHaveCount(0);
});
test("operations fits desktop and small mobile layouts", async ({ page }) => {
  await operationsPage(page, true);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator("main.ws-content")).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `.aureon/screenshots/operations-${width}.png`, fullPage: true });
  }
});
