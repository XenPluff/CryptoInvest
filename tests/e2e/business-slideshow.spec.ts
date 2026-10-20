import { expect, test } from "@playwright/test";
import { businessActivities } from "../../lib/business-activities";

const carousel = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Business activity pictures" });

test.describe("touchscreen controls", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("tapping pause and play resumes automatic rotation without a mouse leave", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await page.goto("/");
    const slides = carousel(page);
    await slides.scrollIntoViewIfNeeded();
    await slides.getByRole("button", { name: "Pause business slideshow" }).tap();
    await page.clock.fastForward(11000);
    await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[0].imageAlt);
    await slides.getByRole("button", { name: "Play business slideshow" }).tap();
    await page.clock.fastForward(5100);
    await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[1].imageAlt);
  });
});

test("homepage slideshow cycles all nine pictures one at a time and supports pause and hover", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  const slides = carousel(page);
  await slides.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(slides.getByRole("img")).toHaveCount(1);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[0].imageAlt);
  for (let index = 1; index <= businessActivities.length; index++) {
    await page.clock.fastForward(5100);
    const activity = businessActivities[index % businessActivities.length];
    await expect(slides.getByRole("img")).toHaveAttribute("alt", activity.imageAlt);
    await expect.poll(() => slides.getByRole("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(slides.getByRole("img")).toHaveCount(1);
  }
  await slides.getByRole("button", { name: "Pause business slideshow" }).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(16000);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[0].imageAlt);
  await slides.getByRole("button", { name: "Play business slideshow" }).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5100);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[1].imageAlt);
  await slides.hover();
  await page.clock.fastForward(11000);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[1].imageAlt);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5100);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[2].imageAlt);
});

test("reduced motion, offscreen pause, failed image loading and responsive layout preserve the current picture", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const slides = carousel(page);
  await slides.scrollIntoViewIfNeeded();
  await expect(slides.getByRole("button", { name: "Play business slideshow" })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(16000);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[0].imageAlt);
  await page.route("**/_next/image?**", route => route.request().url().includes("market-trading.png") ? route.abort() : route.continue());
  await slides.getByRole("button", { name: "Play business slideshow" }).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(11000);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[0].imageAlt);
  await page.unroute("**/_next/image?**");
  await page.clock.fastForward(5100);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[1].imageAlt);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(slides).not.toBeInViewport();
  await page.clock.fastForward(16000);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[1].imageAlt);
  await slides.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5100);
  await expect(slides.getByRole("img")).toHaveAttribute("alt", businessActivities[2].imageAlt);
  await slides.getByRole("button", { name: "Pause business slideshow" }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(slides.getByRole("img")).toHaveCount(1);
    await expect(slides.locator("figcaption")).toHaveCount(0);
    await slides.screenshot({ path: `.aureon/screenshots/business-slideshow-${width}.png` });
  }
  await page.goto("/about");
  await expect(carousel(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});
