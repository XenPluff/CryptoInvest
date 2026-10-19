import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const transaction = vi.hoisted(() => vi.fn());
vi.mock("../server/db", () => ({ prisma: { $transaction: transaction } }));
import { serializable } from "../server/finance";

const conflict = () =>
  Object.assign(new Error("TransactionWriteConflict"), {
    name: "DriverAdapterError",
    cause: { kind: "TransactionWriteConflict" },
  });
beforeEach(() => {
  transaction.mockReset();
});

describe("financial transaction conflict handling", () => {
  it("retries adapter serialization failures and returns only the committed result", async () => {
    transaction
      .mockRejectedValueOnce(conflict())
      .mockResolvedValueOnce("committed");
    await expect(serializable(async () => "unused")).resolves.toBe("committed");
    expect(transaction).toHaveBeenCalledTimes(2);
  });
  it("also retries the Prisma serialization conflict representation", async () => {
    transaction
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("conflict", {
          code: "P2034",
          clientVersion: "6.19.3",
        }),
      )
      .mockResolvedValueOnce("committed");
    await expect(serializable(async () => "unused")).resolves.toBe("committed");
    expect(transaction).toHaveBeenCalledTimes(2);
  });
  it("bounds conflict retries and returns a retryable HTTP conflict instead of a server error", async () => {
    transaction.mockRejectedValue(conflict());
    await expect(serializable(async () => "unused")).rejects.toMatchObject({
      status: 409,
    });
    expect(transaction).toHaveBeenCalledTimes(4);
  });
  it("does not replay a transaction for an unrelated database failure", async () => {
    const unavailable = new Error("database unavailable");
    transaction.mockRejectedValue(unavailable);
    await expect(serializable(async () => "unused")).rejects.toBe(unavailable);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
