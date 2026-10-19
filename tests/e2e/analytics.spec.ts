import { expect, test } from "@playwright/test";

// Isolated UI fixtures exercise currency/state handling without depending on
// CoinGecko uptime. Backend integration tests verify the real vs_currency URL.
test("market currency requests and renders independently quoted values, persisting preference", async ({
  page,
}) => {
  const requested: string[] = [];
  await page.route("**/api/markets?currency=*", async (route) => {
    const currency = new URL(route.request().url()).searchParams.get(
      "currency",
    )!;
    requested.push(currency);
    const prices: Record<string, number> = {
      USD: 100.01,
      EUR: 92.13,
      GBP: 81.77,
    };
    await route.fulfill({
      json: {
        currency,
        assets: [
          {
            id: "bitcoin",
            name: "Bitcoin",
            symbol: "BTC",
            price: prices[currency],
            change24h: null,
          },
        ],
        source: "Test fixture",
        updatedAt: "2026-06-01T12:00:00Z",
        stale: false,
      },
    });
  });
  await page.goto("/insights");
  await expect(
    page.getByRole("cell", { name: "$100.01", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Market currency", { exact: true }).selectOption("EUR");
  await expect(
    page.getByRole("columnheader", { name: "Price · EUR" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "€92.13", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "$100.01", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "Unavailable", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Market currency", { exact: true }).selectOption("GBP");
  await expect(
    page.getByRole("cell", { name: "£81.77", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Market currency", { exact: true })).toHaveValue(
    "GBP",
  );
  await expect(
    page.getByRole("cell", { name: "£81.77", exact: true }),
  ).toBeVisible();
  expect(requested).toContain("USD");
  expect(requested).toContain("EUR");
  expect(requested).toContain("GBP");
});

test("market uses the shared French locale and does not display an older currency after a failed quote", async ({
  page,
}) => {
  await page.route("**/api/markets?currency=*", async (route) => {
    const currency = new URL(route.request().url()).searchParams.get(
      "currency",
    )!;
    if (currency === "GBP")
      return route.fulfill({
        status: 503,
        json: { error: "Quote provider unavailable for this currency." },
      });
    await route.fulfill({
      json: {
        currency,
        assets: [
          {
            id: "bitcoin",
            name: "Bitcoin",
            symbol: "BTC",
            price: 1234.56,
            change24h: -1.25,
          },
        ],
        source: "Test fixture",
        updatedAt: "2026-06-01T12:00:00Z",
        stale: false,
      },
    });
  });
  await page.goto("/insights");
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await page
    .getByLabel("Devise du marché", { exact: true })
    .selectOption("EUR");
  await expect(
    page.getByRole("columnheader", { name: "Cours · EUR" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: /1.234,56.*€/ })).toBeVisible();
  await page
    .getByLabel("Devise du marché", { exact: true })
    .selectOption("GBP");
  await expect(
    page.getByRole("heading", {
      name: "Les cours sont momentanément indisponibles.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Cours · EUR" }),
  ).toHaveCount(0);
  await expect(page.getByText(/1.234,56.*€/)).toHaveCount(0);
});
