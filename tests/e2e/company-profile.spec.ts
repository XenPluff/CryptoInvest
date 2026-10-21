import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import profile from "../../public/documents/aureon-company-profile.json";

test("company profile downloads the complete published PDF and supports byte ranges", async ({ page }) => {
  await page.goto("/company-profile");
  await expect(page.getByRole("heading", { name: /Where value/ })).toBeVisible();
  await expect(page.getByText("28 pages · English · PDF", { exact: true })).toBeVisible();
  const image = page.getByRole("img", { name: /Gold orbital sculpture/ });
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download company profile", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("AUREON-Company-Profile.pdf");
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBe(profile.bytes);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(profile.sha256);
  const partial = await page.request.get(profile.pdf, { headers: { Range: "bytes=0-255" } });
  expect(partial.status()).toBe(206);
  expect(partial.headers()["content-type"]).toContain("application/pdf");
  expect(partial.headers()["content-range"]).toBe(`bytes 0-255/${profile.bytes}`);
  expect((await partial.body()).length).toBe(256);
});

test("profile links and mobile layouts work in both themes and navigation languages", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/company-profile");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["dark", "light"]) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      for (const locale of ["en", "fr"]) {
        await page.locator(".site-header select").selectOption(locale);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await expect(page.locator("footer").getByRole("link", { name: locale === "en" ? "Company profile" : "Profil de l’entreprise", exact: true })).toHaveAttribute("href", "/company-profile");
      }
    }
    await page.screenshot({ path: `.aureon/screenshots/company-profile-${width}.png`, fullPage: true });
  }
  await page.goto("/about");
  await page.locator(".site-header select").selectOption("en");
  await expect(page.locator(".site-header select")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("link", { name: "Download the company profile", exact: true })).toHaveAttribute("href", "/company-profile");
  expect(errors).toEqual([]);
});
