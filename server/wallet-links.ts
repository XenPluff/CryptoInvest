import { randomBytes } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Prisma } from "@prisma/client";
import { getAddress, verifyMessage } from "ethers";
import { z } from "zod";
import { prisma } from "./db";
import { config } from "./config";
import { requireTotp, requireVerified } from "./auth";
import { HttpError } from "./errors";
import { audit, serializable } from "./finance";

const linkInput = z.object({
  address: z
    .string()
    .regex(
      /^0x[0-9a-fA-F]{40}$/,
      "Choose a valid Ethereum-compatible wallet account.",
    ),
  chainId: z.number().int().positive().max(2147483647),
  provider: z.enum(["MetaMask", "Coinbase Wallet", "Browser wallet"]),
});
const verifyInput = z.object({
  challengeId: z.string().min(1).max(100),
  signature: z
    .string()
    .regex(
      /^0x[0-9a-fA-F]{130}$/,
      "The wallet returned an unsupported signature.",
    ),
});

export function normalizeWalletAddress(address: string): string {
  try {
    return getAddress(address).toLowerCase();
  } catch {
    throw new HttpError(
      400,
      "The wallet address has an invalid checksum. Choose the account again in your wallet.",
    );
  }
}

// The exact server-created string is signed using personal_sign (EIP-191).
// It authorizes only a wallet link, never a transfer, approval, or login.
export function walletLinkMessage(input: {
  origin: string;
  address: string;
  userId: string;
  chainId: number;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}): string {
  return `${new URL(input.origin).host} requests proof of wallet ownership for AUREON.\n\nWallet: ${getAddress(input.address)}\nAccount: ${input.userId}\n\nLink this wallet to your signed-in AUREON account. This signature does not authorize a transaction, token approval, or movement of funds.\n\nURI: ${input.origin}\nVersion: 1\nChain ID: ${input.chainId}\nNonce: ${input.nonce}\nIssued At: ${input.issuedAt.toISOString()}\nExpiration Time: ${input.expiresAt.toISOString()}`;
}

export function ownsWalletMessage(
  message: string,
  signature: string,
  address: string,
): boolean {
  try {
    return (
      getAddress(verifyMessage(message, signature)) === getAddress(address)
    );
  } catch {
    return false;
  }
}

export const walletConnectRouter = Router();
walletConnectRouter.use(requireVerified);
walletConnectRouter.use(
  rateLimit({
    windowMs: 15 * 60000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many wallet connection attempts. Please try again later.",
    },
  }),
);

walletConnectRouter.get("/links", async (req, res) => {
  const links = await prisma.walletLink.findMany({
    where: { userId: req.auth!.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      address: true,
      chainId: true,
      provider: true,
      verifiedAt: true,
    },
  });
  res.json({ links });
});

walletConnectRouter.post("/challenge", async (req, res) => {
  const input = linkInput.parse(req.body);
  const userId = req.auth!.user.id;
  const sessionId = req.auth!.sessionId;
  const address = normalizeWalletAddress(input.address);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 5 * 60000);
  const nonce = randomBytes(32).toString("hex");
  const message = walletLinkMessage({
    origin: config.appOrigin,
    address,
    userId,
    chainId: input.chainId,
    nonce,
    issuedAt,
    expiresAt,
  });
  const challenge = await serializable(async (tx) => {
    await tx.walletChallenge.updateMany({
      where: { userId, sessionId, consumedAt: null },
      data: { consumedAt: issuedAt },
    });
    return tx.walletChallenge.create({
      data: {
        ...input,
        address,
        userId,
        sessionId,
        nonce,
        message,
        expiresAt,
        createdAt: issuedAt,
      },
    });
  });
  res.status(201).json({ challengeId: challenge.id, message, expiresAt });
});

walletConnectRouter.post("/verify", async (req, res) => {
  const input = verifyInput.parse(req.body);
  const userId = req.auth!.user.id;
  const sessionId = req.auth!.sessionId;
  const challenge = await prisma.walletChallenge.findFirst({
    where: {
      id: input.challengeId,
      userId,
      sessionId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!challenge)
    throw new HttpError(
      409,
      "This wallet request has expired or was already used. Please connect again.",
    );
  if (!ownsWalletMessage(challenge.message, input.signature, challenge.address))
    throw new HttpError(
      400,
      "The signature does not match the selected wallet. Please connect again.",
    );
  try {
    const link = await serializable(async (tx) => {
      // Compare-and-set makes the challenge single-use, including concurrent requests.
      const consumed = await tx.walletChallenge.updateMany({
        where: {
          id: challenge.id,
          userId,
          sessionId,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new HttpError(
          409,
          "This wallet request has expired or was already used. Please connect again.",
        );
      const existing = await tx.walletLink.findUnique({
        where: { address: challenge.address },
      });
      if (existing && existing.userId !== userId)
        throw new HttpError(
          409,
          "This wallet is already linked to another account.",
        );
      const result = await tx.walletLink.upsert({
        where: { address: challenge.address },
        create: {
          userId,
          address: challenge.address,
          chainId: challenge.chainId,
          provider: challenge.provider,
        },
        update: {
          chainId: challenge.chainId,
          provider: challenge.provider,
          verifiedAt: new Date(),
        },
      });
      await audit(
        tx,
        userId,
        "WALLET_LINKED",
        result.id,
        { address: result.address, chainId: result.chainId },
        req.ip,
      );
      return result;
    });
    res.json({
      link: {
        id: link.id,
        address: link.address,
        chainId: link.chainId,
        provider: link.provider,
        verifiedAt: link.verifiedAt,
      },
      message: "Wallet ownership verified. No funds were moved.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpError(
        409,
        "This wallet is already linked. Please refresh your connections.",
      );
    throw error;
  }
});

walletConnectRouter.delete("/links/:id", async (req, res) => {
  await requireTotp(req.auth!.user, req.body.code);
  const userId = req.auth!.user.id;
  await serializable(async (tx) => {
    const link = await tx.walletLink.findFirst({
      where: { id: String(req.params.id), userId },
    });
    if (!link) throw new HttpError(404, "Wallet connection not found.");
    await tx.walletLink.delete({ where: { id: link.id } });
    await audit(
      tx,
      userId,
      "WALLET_UNLINKED",
      link.id,
      { address: link.address },
      req.ip,
    );
  });
  res.json({
    message:
      "Wallet unlinked from AUREON. You can also remove this site from your wallet’s connected sites.",
  });
});
