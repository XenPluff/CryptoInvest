import { test, expect, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { depositCoinAmount } from "../../lib/deposits";

// Browser fixtures only: no user, transfer, or balance is created on the server.
const wallets = [
  { id: "btc", asset: "BTC", network: "Bitcoin", address: "bc1qd6y65dug0zfrm6dy9m33a27k93psddqdaxs3s4" },
  { id: "eth", asset: "ETH", network: "Ethereum", address: "0x56Eb85F6DE376B668caaa4FD14113FB003772FF9" },
  { id: "usdt-trc", asset: "USDT", network: "TRC20", address: "TXNBz6qWyo72beUWDtC1qKiBdFFb7c1A74" },
  { id: "bnb", asset: "BNB", network: "BSC", address: "0x56Eb85F6DE376B668caaa4FD14113FB003772FF9" },
  { id: "sol", asset: "SOL", network: "Solana", address: "66PAnBEKahkxQzBF1kwDGETHxvrXhrKSoA43ieKwcQG5" },
  { id: "usdt-erc", asset: "USDT", network: "ERC20", address: "0x56Eb85F6DE376B668caaa4FD14113FB003772FF9" },
];

const rates: Record<string, string> = { BTC: "80000", ETH: "2500", USDT: "0.99896", BNB: "750", SOL: "100" };
type Options = { funding?: boolean; eligible?: boolean; identity?: string; fail?: boolean; pricingUnavailable?: boolean };
async function openDeposit(page: Page, options: Options = {}) {
  const submissions: Record<string, any>[] = [];
  const transactions: Record<string, any>[] = [];
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    let data: unknown;
    const asset = url.searchParams.get("asset") || "BTC";
    const price = (symbol: string) => ({ asset: symbol, priceUsd: rates[symbol], source: "Browser price fixture", updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 90000).toISOString() });
    if (path === "/api/auth/me") data = { user: { id: "browser-only", name: "Investor Review", email: "review@example.test", role: "USER", emailVerified: options.eligible !== false, kycStatus: options.identity ?? "APPROVED", twoFactorEnabled: true } };
    else if (path === "/api/notifications") data = { notifications: [] };
    else if (path === "/api/wallets") data = { wallets, fundingEnabled: options.funding !== false };
    else if (path === "/api/transactions") data = { transactions };
    else if (path === "/api/deposit-price") {
      if (options.pricingUnavailable) return route.fulfill({ status: 503, json: { error: "Live deposit pricing is temporarily unavailable." } });
      data = { price: price(asset) };
    } else if (path === "/api/deposits/quote") {
      const body = req.postDataJSON(), wallet = wallets.find(item => item.id === body.walletId)!;
      data = { quote: { ...price(wallet.asset), walletId: wallet.id, network: wallet.network, address: wallet.address, amountCents: Math.round(Number(body.amount) * 100), cryptoAmount: depositCoinAmount(Math.round(Number(body.amount) * 100), rates[wallet.asset], wallet.asset), quotedAt: new Date().toISOString(), quoteToken: "browser-only-signed-instructions" } };
    } else if (path === "/api/deposits" && req.method() === "POST") {
      const body = req.postDataJSON(); submissions.push(body);
      if (options.fail) return route.fulfill({ status: 400, json: { error: "The deposit has already been reported." } });
      const wallet = wallets.find(item => item.id === body.walletId)!;
      const deposit = { ...wallet, id: "browser-deposit", type: "DEPOSIT", amount: body.amount, status: "PENDING", createdAt: "2026-10-22T12:00:00.000Z" };
      transactions.unshift(deposit); return route.fulfill({ status: 201, json: { deposit } });
    } else throw new Error(`Unexpected API request: ${req.method()} ${path}`);
    await route.fulfill({ json: data });
  });
  await page.goto("/dashboard/wallets");
  await expect(page.getByRole("heading", { name: "Add funds", exact: true })).toBeVisible();
  return submissions;
}
async function proceed(page: Page, amount = "250.75") {
  await page.getByLabel("Deposit amount (USD)").fill(amount);
  await page.getByRole("button", { name: "Proceed to payment" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function reportTransfer(page: Page) {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Done — I have sent the funds" }).click();
}

test("all six original destinations appear only after Proceed, with matching QR codes and copyable coin amounts", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openDeposit(page);
  await expect(page.getByTestId("deposit-address")).toHaveCount(0);
  await page.getByLabel("Deposit amount (USD)").fill("100");
  for (const wallet of wallets) {
    await page.locator(".dp-assets button").filter({ has: page.locator("strong", { hasText: new RegExp(`^${wallet.asset}$`) }) }).click();
    await page.locator(`input[name=depositNetwork][value="${wallet.id}"]`).check({ force: true });
    const amount = depositCoinAmount(10000, rates[wallet.asset], wallet.asset);
    await expect(page.getByTestId("deposit-preview-amount")).toHaveText(`${amount} ${wallet.asset}`);
    await page.getByRole("button", { name: "Proceed to payment" }).click();
    await expect(page.getByTestId("deposit-address")).toHaveText(wallet.address);
    await expect(page.getByTestId("deposit-coin-amount")).toHaveText(`${amount} ${wallet.asset}`);
    const pixels = await page.getByTestId("deposit-qr").locator("svg").evaluate(async svg => {
      const source = new XMLSerializer().serializeToString(svg), image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(source)}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 352;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0, 352, 352);
      return Array.from(ctx.getImageData(0, 0, 352, 352).data);
    });
    expect(jsQR(Uint8ClampedArray.from(pixels), 352, 352)?.data).toBe(wallet.address);
    await page.getByRole("button", { name: "Copy deposit address" }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(wallet.address);
    await page.getByRole("button", { name: "Copy coin amount", exact: true }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(amount);
    await page.getByRole("button", { name: "Close payment instructions" }).click();
    await page.getByRole("button", { name: "Start a different deposit" }).click();
  }
});

test("Done requires acknowledgement without a transaction hash and reports the frozen USD/coin instructions without an MFA code", async ({ page }) => {
  const submissions = await openDeposit(page);
  await page.locator(".dp-assets button").filter({ hasText: "USDT" }).click();
  await page.getByRole("radio", { name: "Ethereum ERC20" }).check();
  await proceed(page);
  await page.getByRole("button", { name: "Done — I have sent the funds" }).click();
  expect(submissions).toHaveLength(0);
  await expect(page.locator('input[name="txHash"]')).toHaveCount(0);
  await reportTransfer(page);
  await expect(page.getByRole("heading", { name: "Submitted for review." })).toBeVisible();
  expect(submissions).toEqual([{ walletId: "usdt-erc", amount: 250.75, quoteToken: "browser-only-signed-instructions" }]);
  await expect(page.getByText("Your balance changes only after approval.", { exact: false })).toBeVisible();
  await expect(page.locator(".dp-history-row")).toContainText("PENDING");
});

test("returning from a wallet or reloading resumes the exact instructions", async ({ page }) => {
  await openDeposit(page); await proceed(page);
  const amount = await page.getByTestId("deposit-coin-amount").textContent();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Resume payment" }).click();
  await expect(page.getByTestId("deposit-coin-amount")).toHaveText(amount!);
  await expect(page.locator('input[name="txHash"]')).toHaveCount(0);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});

test("rejection preserves payment details and never claims success", async ({ page }) => {
  await openDeposit(page, { fail: true }); await proceed(page); await reportTransfer(page);
  await expect(page.getByText("The deposit has already been reported.")).toBeVisible();
  await expect(page.locator('input[name="txHash"]')).toHaveCount(0);
  await expect(page.getByTestId("deposit-coin-amount")).toContainText("BTC");
  await expect(page.getByRole("heading", { name: "Submitted for review." })).toHaveCount(0);
});

test("unavailable live prices, paused funding, and incomplete accounts prevent proceeding", async ({ page }) => {
  for (const options of [{ pricingUnavailable: true }, { funding: false }, { eligible: false }]) {
    await page.unroute("**/api/**"); await openDeposit(page, options);
    await expect(page.getByTestId("deposit-address")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Proceed to payment" })).toBeDisabled();
    if (options.pricingUnavailable) { await page.getByLabel("Deposit amount (USD)").fill("100"); await expect(page.getByText("Live deposit pricing is temporarily unavailable.")).toBeVisible(); await expect(page.getByRole("button", { name: "Proceed to payment" })).toBeDisabled(); }
    else await expect(page.getByLabel("Deposit amount (USD)")).toBeDisabled();
    await expect(page.getByLabel("Authenticator code")).toHaveCount(0);
  }
});

test("manual copying, keyboard focus, centered payment and narrow layouts work", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("Denied"); } } }));
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await openDeposit(page); await proceed(page);
  await expect(page.getByRole("button", { name: "Close payment instructions" })).toBeFocused();
  await page.getByRole("button", { name: "Copy deposit address" }).click();
  await expect(page.getByText("Copy unavailable. Select the address or amount to copy it manually.")).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const box = await page.getByRole("dialog").boundingBox();
    expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(box!.y + box!.height / 2 - 500)).toBeLessThan(2);
    expect(box!.height).toBeLessThanOrEqual(980);
    expect(await page.getByRole("dialog").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.getByTestId("deposit-qr").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("deposit-qr").locator("svg")).toBeVisible();
    await page.screenshot({ path: `.aureon/screenshots/deposit-payment-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("payment instructions fit all eight interface languages and preserve canonical wallet values", async ({ page }) => {
  await openDeposit(page); await proceed(page, "100");
  await page.getByRole("button", { name: "Close payment instructions" }).click();
  for (const locale of ["en", "fr", "de", "es", "it", "ru", "uk", "ar"]) {
    await page.locator(".language-selector select").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".language-selector select")).toHaveAttribute("aria-busy", "false");
    await page.locator(".dp-saved-payment .dp-primary-button").click();
    await expect(page.getByTestId("deposit-address")).toHaveText(wallets[0].address);
    await expect(page.getByTestId("deposit-coin-amount")).toHaveText("0.00125 BTC");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.getByRole("dialog").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    if (locale === "ar") await page.screenshot({ path: ".aureon/screenshots/deposit-payment-arabic.png", fullPage: true });
    await page.locator(".dp-close").click();
  }
});

test("identity review is optional and new investors can report deposits before approval", async ({ page }) => {
  for (const identity of ["NOT_SUBMITTED", "PENDING", "REJECTED"]) {
    await page.unroute("**/api/**");
    const submissions = await openDeposit(page, { identity });
    await expect(page.getByText("Identity approved", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Identity verification is optional for deposits/)).toBeVisible();
    await expect(page.getByLabel("Deposit amount (USD)")).toBeEnabled();
    await proceed(page); await reportTransfer(page);
    await expect(page.getByRole("heading", { name: "Submitted for review." })).toBeVisible();
    expect(submissions).toHaveLength(1);
  }
});
