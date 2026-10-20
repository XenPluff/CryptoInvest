import { test, expect, type Page } from "@playwright/test";
import jsQR from "jsqr";

// Browser fixtures only: no user, transfer, or balance is created on the server.
const wallets = [
  { id: "btc", asset: "BTC", network: "Bitcoin", address: "bc1qd6y65dug0zfrm6dy9m33a27k93psddqdaxs3s4" },
  { id: "eth", asset: "ETH", network: "Ethereum", address: "0x56Eb85F6DE376B668caaa4FD14113FB003772FF9" },
  { id: "usdt-trc", asset: "USDT", network: "TRC20", address: "TXNBz6qWyo72beUWDtC1qKiBdFFb7c1A74" },
  { id: "bnb", asset: "BNB", network: "BSC", address: "0x56Eb85F6DE376B668caaa4FD14113FB003772FF9" },
  { id: "sol", asset: "SOL", network: "Solana", address: "66PAnBEKahkxQzBF1kwDGETHxvrXhrKSoA43ieKwcQG5" },
  { id: "usdt-erc", asset: "USDT", network: "ERC20", address: "0x56Eb85F6DE376B668caaa4FD14113FB003772FF9" },
];
type Options = { funding?: boolean; eligible?: boolean; fail?: boolean };
async function openDeposit(page: Page, options: Options = {}) {
  const submissions: Record<string, any>[] = [];
  const transactions: Record<string, any>[] = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path === "/api/auth/me") data = { user: { id: "browser-only", name: "Investor Review", email: "review@example.test", role: "USER", emailVerified: true, kycStatus: options.eligible === false ? "PENDING" : "APPROVED", twoFactorEnabled: options.eligible !== false } };
    else if (path === "/api/notifications") data = { notifications: [] };
    else if (path === "/api/wallets") data = { wallets, fundingEnabled: options.funding !== false };
    else if (path === "/api/transactions") data = { transactions };
    else if (path === "/api/deposits" && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      submissions.push(body);
      if (options.fail) return route.fulfill({ status: 400, json: { error: "The transaction hash has already been submitted." } });
      const wallet = wallets.find(item => item.id === body.walletId)!;
      const deposit = { ...wallet, id: "browser-deposit", type: "DEPOSIT", amount: body.amount, status: "PENDING", createdAt: "2026-10-20T12:00:00.000Z" };
      transactions.unshift(deposit);
      return route.fulfill({ status: 201, json: { deposit } });
    } else throw new Error(`Unexpected API request: ${route.request().method()} ${path}`);
    await route.fulfill({ json: data });
  });
  await page.goto("/dashboard/wallets");
  await expect(page.getByRole("heading", { name: "Submit a deposit" })).toBeVisible();
  return submissions;
}
async function fillTransfer(page: Page) {
  await page.getByLabel("Declared value (USD)").fill("250.75");
  await page.getByLabel("Blockchain transaction hash").fill("a".repeat(64));
  await page.getByLabel("Authenticator code").fill("123456");
}

test("all six supplied wallet destinations produce matching scannable QR codes", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openDeposit(page);
  for (const wallet of wallets) {
    await page.locator(".dp-assets button").filter({ has: page.locator("strong", { hasText: new RegExp(`^${wallet.asset}$`) }) }).click();
    await page.locator(`input[name=depositNetwork][value="${wallet.id}"]`).check({ force: true });
    await expect(page.getByTestId("deposit-address")).toHaveText(wallet.address);
    const pixels = await page.getByTestId("deposit-qr").locator("svg").evaluate(async svg => {
      const source = new XMLSerializer().serializeToString(svg);
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(source)}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 352;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, 352, 352);
      return Array.from(ctx.getImageData(0, 0, 352, 352).data);
    });
    expect(jsQR(Uint8ClampedArray.from(pixels), 352, 352)?.data).toBe(wallet.address);
    await page.getByRole("button", { name: "Copy deposit address" }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(wallet.address);
  }
});

test("network selection clears stale details and submission carries wallet, USD value, hash and authenticator code", async ({ page }) => {
  const submissions = await openDeposit(page);
  await fillTransfer(page);
  await page.locator(".dp-assets button").filter({ hasText: "USDT" }).click();
  await expect(page.getByLabel("Blockchain transaction hash")).toHaveValue("");
  await page.getByRole("radio", { name: "Ethereum ERC20" }).check();
  await fillTransfer(page);
  await page.getByRole("button", { name: "Submit for verification" }).click();
  expect(submissions).toHaveLength(0); // Required acknowledgement prevents an accidental submission.
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByRole("heading", { name: "Submitted for review." })).toBeVisible();
  expect(submissions).toEqual([{ walletId: "usdt-erc", amount: 250.75, txHash: "a".repeat(64), code: "123456" }]);
  await expect(page.getByText("Your balance changes only after approval.", { exact: false })).toBeVisible();
  await expect(page.locator(".dp-history-row")).toContainText("PENDING");
  await expect(page.locator(".dp-history-row")).toContainText("$250.75");
});

test("server rejection preserves transfer details without claiming success", async ({ page }) => {
  await openDeposit(page, { fail: true });
  await fillTransfer(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByText("The transaction hash has already been submitted.")).toBeVisible();
  await expect(page.getByLabel("Declared value (USD)")).toHaveValue("250.75");
  await expect(page.getByLabel("Blockchain transaction hash")).toHaveValue("a".repeat(64));
  await expect(page.getByRole("heading", { name: "Submitted for review." })).toHaveCount(0);
});

test("paused funding hides receiving instructions and incomplete accounts cannot submit", async ({ page }) => {
  await openDeposit(page, { funding: false });
  await expect(page.getByTestId("deposit-address")).toHaveCount(0);
  await expect(page.getByTestId("deposit-qr")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit for verification" })).toBeDisabled();
  await page.unroute("**/api/**");
  await openDeposit(page, { eligible: false });
  await expect(page.getByRole("link", { name: "Complete setup" })).toHaveAttribute("href", "/dashboard/account");
  await expect(page.getByRole("button", { name: "Submit for verification" })).toBeDisabled();
  await expect(page.getByLabel("Authenticator code")).toBeDisabled();
});

test("copy denial offers manual copying and mobile layouts stay within the viewport", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("Denied"); } } }));
  await openDeposit(page);
  await page.getByRole("button", { name: "Copy deposit address" }).click();
  await expect(page.getByText("Copy unavailable. Select the address above to copy it manually.")).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator("main.ws-content")).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByTestId("deposit-qr").locator("svg")).toBeVisible();
    if (width < 650) {
      const submit = await page.locator(".dp-sidebar").boundingBox();
      const history = await page.locator(".dp-history").boundingBox();
      expect(submit!.y).toBeLessThan(history!.y);
    }
    await page.screenshot({ path: `.aureon/screenshots/deposits-${width}.png`, fullPage: true });
  }
});
