export const depositDecimals: Record<string, number> = { BTC: 8, ETH: 18, USDT: 6, BNB: 18, SOL: 9 };
export type DepositPrice = { asset: string; priceUsd: string; source: string; updatedAt: string; expiresAt: string };
export type DepositInstructions = DepositPrice & {
  walletId: string; network: string; address: string; amountCents: number;
  cryptoAmount: string; quotedAt: string; quoteToken: string;
};

// Integer arithmetic keeps the wallet amount within the asset's transferable precision.
// Round up by at most one smallest unit, never silently round a small deposit to zero.
export function depositCoinAmount(amountCents: number, priceUsd: string, asset: string): string {
  const decimals = depositDecimals[asset];
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || decimals === undefined || !/^\d+(?:\.\d{1,18})?$/.test(priceUsd)) throw new Error("Invalid deposit conversion.");
  const [whole, fraction = ""] = priceUsd.split(".");
  const price = BigInt(whole + fraction);
  if (price <= 0n) throw new Error("Invalid deposit price.");
  const numerator = BigInt(amountCents) * 10n ** BigInt(fraction.length + decimals);
  const denominator = 100n * price;
  const units = (numerator + denominator - 1n) / denominator;
  const digits = units.toString().padStart(decimals + 1, "0");
  return (digits.slice(0, -decimals) + "." + digits.slice(-decimals)).replace(/\.?0+$/, "");
}

export function depositUsdCents(input: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) return null;
  const [dollars, fraction = ""] = input.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 1_000_000_000 ? cents : null;
}
