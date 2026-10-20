import { expect, test, type Page } from "@playwright/test";
import { CARD_PROGRAM, type CardApplication } from "../../lib/cards";

const user = { id: "card-browser-user", name: "Card Preview Investor", email: "card-preview@example.test", role: "USER", emailVerified: true, kycStatus: "APPROVED", twoFactorEnabled: true };
function fixture(): CardApplication {
  return { id: "browser-card-application", network: "VISA", format: "PHYSICAL", country: "United Kingdom", intendedUse: "PERSONAL", status: "SUBMITTED", version: 1, consentVersion: "card-prelaunch-v1", consentedAt: "2026-10-20T12:00:00.000Z", submittedAt: "2026-10-20T12:00:00.000Z", updatedAt: "2026-10-20T12:00:00.000Z", reviewedAt: null, reviewMessage: null, events: [{ id: "submitted", status: "SUBMITTED", message: "Pre-launch application recorded. No card has been issued.", createdAt: "2026-10-20T12:00:00.000Z" }] };
}
async function setup(page: Page, options: { admin?: boolean; fail?: boolean; verified?: boolean; application?: boolean } = {}) {
  let record: CardApplication | null = options.application || options.admin ? fixture() : null;
  const bodies: { path: string; body: any }[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { ...user, ...(options.admin ? { id: "browser-admin", name: "Card Operator", role: "ADMIN" } : {}), emailVerified: options.verified !== false } } });
    if (path === "/api/notifications") return route.fulfill({ json: { notifications: [] } });
    if (path === "/api/cards" && request.method() === "GET") return route.fulfill({ json: { program: CARD_PROGRAM, application: record } });
    if (path === "/api/cards/applications" && request.method() === "POST") {
      const body = request.postDataJSON(); bodies.push({ path, body });
      if (options.fail) return route.fulfill({ status: 409, json: { error: "The application changed. Please reload before submitting again." } });
      record = { ...fixture(), network: body.network, country: body.country, format: body.format, intendedUse: body.intendedUse };
      return route.fulfill({ status: 201, json: { program: CARD_PROGRAM, application: record } });
    }
    if (path.endsWith("/withdraw") && request.method() === "POST") {
      const body = request.postDataJSON(); bodies.push({ path, body });
      record = { ...record!, status: "WITHDRAWN", version: record!.version + 1, reviewMessage: "Withdrawn by the applicant.", events: [{ id: "withdrawn", status: "WITHDRAWN", message: "Application withdrawn; history retained.", createdAt: "2026-10-20T12:05:00.000Z" }, ...record!.events!] };
      return route.fulfill({ json: { application: record } });
    }
    if (path === "/api/admin/card-applications") {
      const query = new URL(request.url()).searchParams;
      const matches = record && (!query.get("status") || record.status === query.get("status"));
      return route.fulfill({ json: { program: CARD_PROGRAM, applications: matches ? [{ ...record, user: { ...user, emailVerifiedAt: "2026-10-20T00:00:00.000Z", suspended: false, kyc: { status: "APPROVED" } } }] : [], total: matches ? 1 : 0, page: 1, pageSize: 25 } });
    }
    if (path.endsWith("/review") && request.method() === "POST") {
      const body = request.postDataJSON(); bodies.push({ path, body });
      record = { ...record!, status: body.status, reviewMessage: body.message, version: record!.version + 1, reviewedAt: "2026-10-20T12:05:00.000Z", events: [{ id: "review", status: body.status, message: body.message, createdAt: "2026-10-20T12:05:00.000Z" }, ...record!.events!] };
      return route.fulfill({ json: { application: record } });
    }
    throw new Error(`Unexpected card fixture request ${request.method()} ${path}`);
  });
  await page.goto(options.admin ? "/admin/cards" : "/dashboard/cards");
  await expect(page.locator("main.ws-content")).toHaveCSS("opacity", "1");
  return bodies;
}
async function fill(page: Page) {
  await page.getByRole("button", { name: "Visa concept", exact: true }).click();
  await page.getByLabel("Country of residence").fill("Australia");
  await page.getByLabel("Card format preference").selectOption("VIRTUAL");
  await page.getByLabel("Intended use").selectOption("BOTH");
  for (const box of await page.getByRole("checkbox").all()) await box.check();
}

test("public card concepts flip accessibly, switch networks and expose valid artwork", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cards");
  await expect(page.getByRole("img", { name: /AUREON Mastercard card concept, front view/ })).toBeVisible();
  await page.getByRole("button", { name: "Show back" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("img", { name: /AUREON Mastercard card concept, back view/ })).toBeVisible();
  await page.getByRole("button", { name: "Visa concept", exact: true }).click();
  await expect(page.getByRole("img", { name: /AUREON Visa card concept, back view/ })).toBeVisible();
  await page.getByRole("img", { name: /AUREON Visa card concept, back view/ }).screenshot({ path: ".aureon/screenshots/cards-visa-back.png" });
  await page.getByRole("button", { name: "Show front" }).click();
  await expect(page.getByRole("img", { name: /AUREON Visa card concept, front view/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Card program availability" })).toContainText("Worldwide use is not available");
  const image = page.getByRole("img", { name: /AI-generated AUREON Visa/ }); await image.scrollIntoViewIfNeeded(); await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const artwork = await page.request.get("/images/cards/aureon-card-concepts.png"); expect(artwork.status()).toBe(200); expect((await artwork.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
});
test("investor acknowledgement, preferences, receipt and withdrawal use the correct API payloads", async ({ page }) => {
  const bodies = await setup(page); await page.getByRole("button", { name: "Submit pre-launch application" }).click(); expect(bodies).toHaveLength(0);
  await fill(page); await page.getByRole("button", { name: "Submit pre-launch application" }).click();
  await expect(page.getByRole("heading", { name: "Your application", exact: true })).toBeVisible();
  expect(bodies[0].body).toEqual({ network: "VISA", format: "VIRTUAL", country: "Australia", intendedUse: "BOTH", consentVersion: "card-prelaunch-v1", acknowledgePrelaunch: true, acknowledgePrivacy: true, confirmAdult: true });
  await expect(page.getByText("No card or credit facility has been issued.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Withdraw application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Submit an updated application" })).toBeVisible();
  expect(bodies[1].body).toEqual({ version: 1 }); await expect(page.getByText("Application withdrawn", { exact: true }).first()).toBeVisible();
});
test("server failures preserve preferences and unverified accounts cannot submit", async ({ page }) => {
  await setup(page, { fail: true }); await fill(page); await page.getByRole("button", { name: "Submit pre-launch application" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The application changed" })).toBeVisible(); await expect(page.getByLabel("Country of residence")).toHaveValue("Australia"); await expect(page.getByRole("heading", { name: "Your application", exact: true })).toHaveCount(0);
  await page.unroute("**/api/**"); await setup(page, { verified: false }); await expect(page.getByRole("button", { name: "Submit pre-launch application" })).toBeDisabled();
});
test("administrators review applications with a fresh authenticator and applicant-visible message", async ({ page }) => {
  const bodies = await setup(page, { admin: true });
  await page.getByLabel("Filter application status").selectOption("DECLINED"); await expect(page.getByText("No matching applications", { exact: true })).toBeVisible();
  await page.getByLabel("Filter application status").selectOption(""); await page.getByRole("button", { name: "Review Card Preview Investor" }).click();
  await page.getByLabel("Preliminary outcome").selectOption("WAITLISTED"); await page.getByLabel("Message to applicant").fill("Preliminary review complete. You are on the pre-launch list; no credit is approved.");
  await page.getByRole("button", { name: "Save preliminary review" }).click(); expect(bodies).toHaveLength(0);
  await page.getByLabel("Your administrator authenticator code").fill("123456"); await page.getByRole("button", { name: "Save preliminary review" }).click();
  await expect(page.locator("table").getByText("On the pre-launch list", { exact: true })).toBeVisible(); expect(bodies[0].body).toEqual({ status: "WAITLISTED", message: "Preliminary review complete. You are on the pre-launch list; no credit is approved.", code: "123456", version: 1 });
  await expect(page.getByRole("button", { name: "Save preliminary review" })).toHaveCount(0);
});
test("public, investor and admin card pages fit mobile and desktop without page errors", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const mode of ["public", "investor", "admin"]) {
    if (mode === "public") await page.goto("/cards"); else { await page.unroute("**/api/**"); await setup(page, { admin: mode === "admin" }); }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `${mode} ${width}` }).toBe(true);
      if (mode !== "admin") { await page.getByRole("button", { name: "Show back" }).click(); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); await page.getByRole("button", { name: "Show front" }).click(); }
      await page.screenshot({ path: `.aureon/screenshots/cards-${mode}-${width}.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});
