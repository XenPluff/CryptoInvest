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
    useLocale.getState().setLocale("en");
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
      JSON.stringify({ state: { locale: "es" }, version: 0 }),
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
