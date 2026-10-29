import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { depositCoinAmount, depositDecimals, type DepositPrice } from "../lib/deposits";
import { HttpError } from "./errors";
import { externalFetch } from "./network";

const ids: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", USDT: "tether", BNB: "binancecoin", SOL: "solana" };
const decimal = z.string().regex(/^\d+(?:\.\d{1,18})?$/).refine(value => Number.isFinite(Number(value)) && Number(value) > 0);
export function createDepositPriceReader(fetcher = externalFetch, now = Date.now) {
  const cache = new Map<string, { time: number; value: DepositPrice }>();
  const pending = new Map<string, Promise<DepositPrice>>();
  return async (asset: string): Promise<DepositPrice> => {
    if (!Object.hasOwn(depositDecimals, asset)) throw new HttpError(400, "Unsupported deposit currency.");
    const saved = cache.get(asset);
    if (saved && now() - saved.time < 25_000) return saved.value;
    if (!pending.has(asset)) pending.set(asset, (async () => {
      let priceUsd: string, source: string, updatedAt: string;
      try {
        const response = await fetcher(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
        if (!response.ok) throw new Error("Price unavailable");
        const { data } = z.object({ data: z.object({ amount: decimal, base: z.literal(asset), currency: z.literal("USD") }) }).parse(await response.json());
        priceUsd = data.amount; source = "Coinbase"; updatedAt = new Date(now()).toISOString();
      } catch {
        try {
          const response = await fetcher(`https://api.coingecko.com/api/v3/simple/price?ids=${ids[asset]}&vs_currencies=usd&include_last_updated_at=true`, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
          if (!response.ok) throw new Error("Price unavailable");
          const record = z.object({ usd: z.number().positive().finite(), last_updated_at: z.number().int().positive() }).parse((await response.json())[ids[asset]]);
          if (now() - record.last_updated_at * 1000 > 180_000 || record.last_updated_at * 1000 > now() + 30_000) throw new Error("Stale price");
          priceUsd = decimal.parse(String(record.usd)); source = "CoinGecko"; updatedAt = new Date(record.last_updated_at * 1000).toISOString();
        } catch { throw new HttpError(503, "Live deposit pricing is temporarily unavailable. Refresh the price before proceeding."); }
      }
      const value = { asset, priceUsd, source, updatedAt, expiresAt: new Date(now() + 90_000).toISOString() };
      cache.set(asset, { time: now(), value }); return value;
    })().finally(() => { pending.delete(asset); }));
    return pending.get(asset)!;
  };
}
export const readDepositPrice = createDepositPriceReader();
const quoteSchema = z.object({
  asset: z.string(), priceUsd: decimal, source: z.string(), updatedAt: z.iso.datetime(), expiresAt: z.iso.datetime(),
  walletId: z.string(), network: z.string(), address: z.string(), amountCents: z.number().int().positive().max(1_000_000_000),
  cryptoAmount: decimal, quotedAt: z.iso.datetime(), instructionId: z.uuid().optional(),
});
export function signDepositInstructions(userId: string, wallet: { id: string; asset: string; network: string; address: string }, amountCents: number, price: DepositPrice, secret: string) {
  const quote = quoteSchema.parse({ instructionId: randomUUID(), ...price, walletId: wallet.id, network: wallet.network, address: wallet.address, amountCents, cryptoAmount: depositCoinAmount(amountCents, price.priceUsd, wallet.asset), quotedAt: new Date().toISOString() });
  return { ...quote, quoteToken: jwt.sign({ purpose: "deposit-instructions", userId, quote }, secret, { algorithm: "HS256", expiresIn: "7d" }) };
}
export function verifyDepositInstructions(token: string, userId: string, secret: string) {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload !== "object" || payload.purpose !== "deposit-instructions" || payload.userId !== userId) throw new Error("Wrong quote owner");
    return quoteSchema.parse(payload.quote);
  } catch { throw new HttpError(400, "These payment instructions could not be verified. Contact support if you have already sent funds."); }
}
