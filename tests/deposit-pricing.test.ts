import { describe, expect, it, vi } from "vitest";
import { depositCoinAmount, depositUsdCents } from "../lib/deposits";
import { createDepositPriceReader, signDepositInstructions, verifyDepositInstructions } from "../server/deposit-pricing";

describe("transferable deposit amounts", () => {
  it("uses integer decimal arithmetic, rounds up only one smallest unit, and never assumes USDT is $1", () => {
    expect(depositCoinAmount(10000, "80000", "BTC")).toBe("0.00125");
    expect(depositCoinAmount(1, "81378", "BTC")).toBe("0.00000013");
    expect(depositCoinAmount(10000, "0.99896", "USDT")).toBe("100.104109");
    expect(depositCoinAmount(100, "3", "ETH")).toBe("0.333333333333333334");
    expect(depositCoinAmount(10000, "100", "SOL")).toBe("1");
    expect(() => depositCoinAmount(100, "0", "BTC")).toThrow();
    expect(() => depositCoinAmount(100, "80000", "UNKNOWN")).toThrow();
  });
  it("accepts exact USD cents within ledger limits", () => {
    expect(depositUsdCents("250.75")).toBe(25075);
    expect(depositUsdCents("10000000")).toBe(1000000000);
    for (const value of ["", "0", "-1", "1.001", "1e3", "10000000.01"]) expect(depositUsdCents(value)).toBeNull();
  });
});
describe("current provider pricing", () => {
  it("deduplicates parallel requests, caches briefly, then requires a fresh provider response", async () => {
    let clock = Date.now();
    const fetcher = vi.fn(async () => Response.json({ data: { amount: "81354.525", base: "BTC", currency: "USD" } }));
    const read = createDepositPriceReader(fetcher, () => clock);
    const [first, second] = await Promise.all([read("BTC"), read("BTC")]);
    expect(first).toEqual(second); expect(fetcher).toHaveBeenCalledTimes(1);
    await read("BTC"); expect(fetcher).toHaveBeenCalledTimes(1);
    clock += 26000; await read("BTC"); expect(fetcher).toHaveBeenCalledTimes(2);
    await expect(read("DOGE")).rejects.toThrow("Unsupported");
  });
  it("uses a timestamp-checked alternate source and rejects stale or invalid data", async () => {
    const now = Date.now(); let age = 10;
    const fetcher = vi.fn(async (url: string) => url.includes("coinbase") ? Response.json({}, { status: 503 }) : Response.json({ tether: { usd: 0.99896, last_updated_at: Math.floor(now / 1000) - age } }));
    expect((await createDepositPriceReader(fetcher, () => now)("USDT")).priceUsd).toBe("0.99896");
    age = 190;
    await expect(createDepositPriceReader(fetcher, () => now)("USDT")).rejects.toThrow("temporarily unavailable");
    const invalid = async () => Response.json({ data: { amount: "0", base: "ETH", currency: "EUR" } });
    await expect(createDepositPriceReader(invalid)("ETH")).rejects.toThrow("temporarily unavailable");
  });
  it("never silently serves a previous price after the cache window when providers fail", async () => {
    let clock = Date.now(), fail = false;
    const read = createDepositPriceReader(async () => fail ? Response.json({}, { status: 503 }) : Response.json({ data: { amount: "2000", base: "ETH", currency: "USD" } }), () => clock);
    await read("ETH"); clock += 26000; fail = true;
    await expect(read("ETH")).rejects.toThrow("temporarily unavailable");
  });
});
it("binds payment instructions to their owner and signed amount without treating the price as a guaranteed credit", () => {
  const secret = "test-only-quote-secret", time = new Date().toISOString();
  const quote = signDepositInstructions("owner", { id: "eth", asset: "ETH", network: "Ethereum", address: "0x" + "1".repeat(40) }, 25075, { asset: "ETH", priceUsd: "2500", source: "Coinbase", updatedAt: time, expiresAt: new Date(Date.now() + 90000).toISOString() }, secret);
  expect(quote.cryptoAmount).toBe("0.1003");
  expect(verifyDepositInstructions(quote.quoteToken, "owner", secret).amountCents).toBe(25075);
  expect(() => verifyDepositInstructions(quote.quoteToken, "another-investor", secret)).toThrow("could not be verified");
  expect(() => verifyDepositInstructions(quote.quoteToken.slice(0, -4) + "BAD!", "owner", secret)).toThrow("could not be verified");
});
