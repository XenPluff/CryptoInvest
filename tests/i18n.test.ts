import { afterEach, describe, expect, it, vi } from "vitest";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>(
    initial ? [["aureon-language", initial]] : [],
  );
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("language preferences", () => {
  it("hydrates a saved locale only when requested and persists subsequent choices", async () => {
    const storage = memoryStorage(
      JSON.stringify({ state: { locale: "fr" }, version: 0 }),
    );
    vi.stubGlobal("localStorage", storage);
    const { useLocale } = await import("../lib/i18n");
    // The first browser render matches the English server HTML.
    expect(useLocale.getState().locale).toBe("en");
    await useLocale.persist.rehydrate();
    expect(useLocale.getState().locale).toBe("fr");
    await useLocale.getState().setLocale("en");
    expect(JSON.parse(storage.getItem("aureon-language")!).state).toEqual({
      locale: "en",
    });
    // Actions and other user data must not be stored with the language preference.
    expect(
      Object.keys(JSON.parse(storage.getItem("aureon-language")!).state),
    ).toEqual(["locale"]);
  });

  it("rejects unsupported or tampered persisted locale data", async () => {
    const storage = memoryStorage(
      JSON.stringify({ state: { locale: { lang: "fr" } }, version: 0 }),
    );
    vi.stubGlobal("localStorage", storage);
    const { useLocale } = await import("../lib/i18n");
    await useLocale.persist.rehydrate();
    expect(useLocale.getState().locale).toBe("en");
    storage.setItem(
      "aureon-language",
      JSON.stringify({ state: { locale: "xx" }, version: 0 }),
    );
    await useLocale.persist.rehydrate();
    expect(useLocale.getState().locale).toBe("en");
  });
});

describe("translation fallbacks", () => {
  it("preserves canonical copy, unknown server responses, and prototype-shaped keys", async () => {
    const { translate } = await import("../lib/i18n");
    expect(translate("en", "Investment plans")).toBe("Investment plans");
    expect(translate("fr", "Investment plans")).toBe("Offres d’investissement");
    for (const response of [
      "Payment is unavailable until custody is configured.",
      "constructor",
      "__proto__",
      "<script>alert(1)</script>",
    ]) {
      expect(translate("fr", response)).toBe(response);
    }
    expect(
      translate(
        "fr",
        "A clear perspective on risk. Target returns are illustrative and never guaranteed.",
      ),
    ).toContain("ne sont jamais garantis");
  });
});


describe("complete language catalogs", () => {
  it("includes every registered interface message and preserves template parameters and disclosed rates", async () => {
    const { readFile } = await import("node:fs/promises");
    const { loadLocale, supportedLocales } = await import("../lib/i18n");
    const source = JSON.parse(await readFile("lib/locales/source.json", "utf8"));
    const rateKey = Object.keys(source).find(key => key.startsWith("The displayed daily target rates of"))!;
    const placeholders = (value: string) => [...value.matchAll(/\{\d+\}/g)].map(match => match[0]).sort();
    const rates = (value: string) => [...value.matchAll(/(\d+(?:[.,]\d+)?)\s*[%٪]/g)].map(match => Number(match[1].replace(",", "."))).sort((a,b) => a-b);
    for (const locale of supportedLocales.filter(value => value !== "en")) {
      const catalog = await loadLocale(locale);
      expect(Object.keys(source).filter(key => typeof catalog[key] !== "string" || !catalog[key])).toEqual([]);
      expect(Object.keys(source).filter(key => JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(catalog[key])))).toEqual([]);
      expect(rates(catalog[rateKey])).toEqual(rates(rateKey));
    }
  });

  it("loads every requested language and preserves dynamic values and unknown private text", async () => {
    const { loadLocale, translate, supportedLocales } = await import("../lib/i18n");
    expect(supportedLocales).toEqual(["en", "fr", "de", "es", "it", "ru", "uk", "ar"]);
    for (const locale of supportedLocales.filter(value => value !== "en")) {
      await loadLocale(locale);
      expect(translate(locale, "Investment plans")).not.toBe("Investment plans");
      expect(translate(locale, "Country of residence")).not.toBe("Country of residence");
      expect(translate(locale, "Page 2 of 19")).toContain("2");
      expect(translate(locale, "Page 2 of 19")).toContain("19");
      for (const raw of ["constructor", "__proto__", "0x1234567890abcdef", "private@example.test", "Client-specific note 46791"]) expect(translate(locale, raw)).toBe(raw);
    }
  });

  it("persists only the latest selected locale, without catalogs or account data", async () => {
    const storage = memoryStorage(); vi.stubGlobal("localStorage", storage);
    const { useLocale } = await import("../lib/i18n");
    await Promise.all([useLocale.getState().setLocale("de"), useLocale.getState().setLocale("ar"), useLocale.getState().setLocale("uk")]);
    expect(useLocale.getState().locale).toBe("uk");
    expect(JSON.parse(storage.getItem("aureon-language")!).state).toEqual({locale: "uk"});
  });
});
