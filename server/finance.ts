import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
export const MAX_AMOUNT_CENTS = 1000000000;
export function toCents(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "string")
    throw new HttpError(400, "Enter a valid USD amount.");
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new HttpError(
      400,
      "USD amounts must have no more than two decimal places.",
    );
  const [dollars, cents = ""] = text.split(".");
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_CENTS)
    throw new HttpError(400, "Amount must be between $0.01 and $10,000,000.");
  return amount;
}
export async function serializable<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (error) {
      const conflict =
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034") ||
        (error instanceof Error &&
          error.name === "DriverAdapterError" &&
          typeof error.cause === "object" &&
          error.cause !== null &&
          "kind" in error.cause &&
          error.cause.kind === "TransactionWriteConflict");
      if (conflict) {
        if (attempt < 3) continue;
        throw new HttpError(
          409,
          "Another account operation is in progress. Please retry.",
        );
      }
      throw error;
    }
  }
  throw new HttpError(
    409,
    "Another account operation is in progress. Please retry.",
  );
}
export async function balanceCents(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const sum = await tx.ledgerEntry.aggregate({
    where: { userId },
    _sum: { amountCents: true },
  });
  return sum._sum.amountCents || 0;
}
export async function assertBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
) {
  if ((await balanceCents(tx, userId)) < amount)
    throw new HttpError(409, "Insufficient available balance.");
}
export async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  targetId: string,
  metadata: Prisma.InputJsonValue = {},
  ip?: string,
) {
  await tx.auditLog.create({
    data: { actorId, action, targetId, metadata, ip },
  });
}
