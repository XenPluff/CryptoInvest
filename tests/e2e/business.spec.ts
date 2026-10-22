import { expect, test } from "@playwright/test";
import { businessActivities } from "../../lib/business-activities";

test("all sector pictures load and original branded artwork can be downloaded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/approach");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Where value");
  await expect(page.getByRole("region", { name: "About these business descriptions" })).toContainText("COMPANY-REPORTED ACTIVITIES");
  for (const activity of businessActivities) {
    const article = page.locator(`article#${activity.id}`);
    const image = article.getByRole("img", { name: activity.imageAlt, exact: true });
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const download = article.getByRole("link", { name: `Download ${activity.title} artwork` });
    const artwork = await page.request.get((await download.getAttribute("href"))!);
    expect(artwork.status()).toBe(200);
    expect(artwork.headers()["content-type"]).toContain("image/png");
    expect((await artwork.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    await expect(article.getByText("AI-generated sector illustration", { exact: true })).toHaveCount(0);
  }
  const trading = page.locator("article#market-trading");
  await expect(trading).toContainText("Trading activities must remain within approved risk limits and applicable regulatory permissions.");
  await expect(trading.getByText("THE PEOPLE BEHIND THE PROCESS", { exact: true })).toHaveCount(0);
  await page.locator("article#crypto-mining summary").click();
  await expect(page.locator("article#crypto-mining").getByRole("heading", { name: "Records that should support the activity" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("activity navigation and the homepage preview fit desktop and mobile in both themes", async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/approach", "/", "/about"]) {
      await page.goto(route);
      for (const theme of ["dark", "light"]) {
        await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route}: ${width}px ${theme}`).toBe(true);
      }
    }
  }
  await page.goto("/approach");
  await page.getByRole("navigation", { name: "Explore business activities" }).getByRole("link", { name: /Artificial intelligence & robotics/ }).click();
  await expect(page).toHaveURL(/#ai-robotics$/);
  await expect(page.getByRole("heading", { name: "Artificial intelligence & robotics", exact: true })).toBeInViewport();
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the business model", exact: true }).click();
  await expect(page).toHaveURL(/\/approach$/);
});
