import { Wallet } from "ethers";
import { describe, expect, it, vi } from "vitest";

vi.mock("../server/config", () => ({
  config: { appOrigin: "https://aureon.example" },
}));
vi.mock("../server/db", () => ({ prisma: {} }));
vi.mock("../server/auth", () => ({
  requireVerified: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireTotp: vi.fn(),
}));
vi.mock("../server/finance", () => ({ audit: vi.fn(), serializable: vi.fn() }));

import {
  normalizeWalletAddress,
  ownsWalletMessage,
  walletLinkMessage,
} from "../server/wallet-links";

describe("wallet ownership proof", () => {
  const owner = Wallet.createRandom();
  const differentOwner = Wallet.createRandom();
  const input = {
    origin: "https://aureon.example",
    address: owner.address,
    userId: "account_123",
    chainId: 1,
    nonce: "9a".repeat(32),
    issuedAt: new Date("2026-10-19T01:00:00Z"),
    expiresAt: new Date("2026-10-19T01:05:00Z"),
  };

  it("recovers the owner from a real EIP-191 signature of the exact server message", async () => {
    const message = walletLinkMessage(input);
    const signature = await owner.signMessage(message);
    expect(ownsWalletMessage(message, signature, owner.address)).toBe(true);
    expect(
      ownsWalletMessage(message, signature, owner.address.toLowerCase()),
    ).toBe(true);
    expect(message).toContain("URI: https://aureon.example");
    expect(message).toContain("Account: account_123");
    expect(message).toContain(
      "This signature does not authorize a transaction",
    );
  });

  it("rejects an unrelated wallet, malformed signature, or altered signed content", async () => {
    const message = walletLinkMessage(input);
    const signature = await owner.signMessage(message);
    expect(ownsWalletMessage(message, signature, differentOwner.address)).toBe(
      false,
    );
    expect(ownsWalletMessage(message, "0x00", owner.address)).toBe(false);
    for (const field of [
      { origin: "https://other.example" },
      { userId: "other_account" },
      { chainId: 8453 },
      { nonce: "ac".repeat(32) },
      { expiresAt: new Date("2026-10-19T02:00:00Z") },
    ])
      expect(
        ownsWalletMessage(
          walletLinkMessage({ ...input, ...field }),
          signature,
          owner.address,
        ),
      ).toBe(false);
  });

  it("normalizes valid wallet addresses and reports invalid mixed-case checksums as input errors", () => {
    expect(normalizeWalletAddress(owner.address)).toBe(
      owner.address.toLowerCase(),
    );
    const invalid = "0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    try {
      normalizeWalletAddress(invalid);
      throw new Error("Expected invalid checksum to fail");
    } catch (error) {
      expect(error).toMatchObject({ status: 400 });
    }
  });
});
