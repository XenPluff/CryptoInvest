import { expect, test } from "@playwright/test";
import { aureonVideos, videoDuration } from "../../lib/video-content";

test("all five published films decode with captions and the expected duration", async ({ page }) => {
  const errors: string[] = [];
  const mediaRequests: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.url().endsWith(".mp4")) mediaRequests.push(request.url()); });
  await page.goto("/videos");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See the process.");
  const video = page.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  expect(mediaRequests).toEqual([]);
  for (const movie of aureonVideos) {
    await page.getByRole("button", { name: new RegExp(movie.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
    await expect(video).toHaveAttribute("aria-label", movie.title);
    await video.evaluate(async element => { element.muted = true; await element.play(); });
    await expect.poll(() => video.evaluate(element => element.currentTime)).toBeGreaterThan(0);
    const metadata = await video.evaluate(element => ({ duration: element.duration, width: element.videoWidth, height: element.videoHeight }));
    expect(metadata.duration).toBeCloseTo(videoDuration(movie), 1);
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBe(720);
    await expect.poll(() => video.evaluate(element => element.textTracks[0]?.cues?.length || 0)).toBe(movie.scenes.length);
    await video.evaluate(element => element.pause());
    await expect(page.getByRole("link", { name: "Download MP4" })).toHaveAttribute("href", `/videos/${movie.id}.mp4`);
  }
  expect(errors).toEqual([]);
});

test("guide deep links, transcript and chapter seeking work", async ({ page }) => {
  await page.goto("/videos#deposit-guide");
  const video = page.locator("video");
  await expect(video).toHaveAttribute("aria-label", "Understand the deposit process");
  await page.getByText("Chapters & full transcript", { exact: true }).click();
  await expect(page.getByText("A hash alone never credits", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Play Match the network. at 0:16" }).click();
  await expect.poll(() => video.evaluate(element => element.currentTime)).toBeGreaterThanOrEqual(16);
  await video.evaluate(element => element.pause());
  await expect(page.getByRole("link", { name: "Open deposit workspace" })).toHaveAttribute("href", "/dashboard/wallets");
});

test("library and homepage fit narrow and wide viewports in both themes", async ({ page }) => {
  for (const width of [1440, 1152, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/videos", "/"]) {
      await page.goto(route);
      for (const theme of ["dark", "light"]) {
        await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        expect(overflow, `${route}, ${width}px, ${theme}`).toBe(false);
      }
      if (route === "/videos") await expect(page.getByRole("complementary", { name: "Choose a video" })).toBeVisible();
      await page.locator(".site-header select").selectOption("fr");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${route}, ${width}px, French`).toBe(true);
      await page.locator(".site-header select").selectOption("en");
    }
  }
});
