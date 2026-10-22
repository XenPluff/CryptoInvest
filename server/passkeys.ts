import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { Prisma, type User } from "@prisma/client";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { z } from "zod";
import { prisma } from "./db";
import { config } from "./config";
import { tokenHash } from "./crypto";
import { HttpError } from "./errors";
import {
  issueAuthSession,
  requireAuth,
  requireTotp,
  serializeUser,
} from "./auth";

const rpID = new URL(config.appOrigin).hostname;
const challengeLifetime = 5 * 60 * 1000;
const failure =
  "Passkey verification failed. Try again and include your authenticator code if enabled.";
const expired =
  "This passkey request is invalid or expired. Please start again.";
const credentialId = z.string().regex(/^[A-Za-z0-9_-]{1,2048}$/);
const proof = z.object({
  password: z.string().max(128).optional(),
  code: z.string().max(20).optional(),
});
const assertion = z
  .object({
    id: credentialId,
    rawId: credentialId,
    type: z.literal("public-key"),
    response: z.record(z.string(), z.unknown()),
    clientExtensionResults: z.record(z.string(), z.unknown()),
  })
  .passthrough();
const encoded = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/)
  .max(32000);
const registrationResponse = assertion
  .extend({
    response: z
      .object({
        clientDataJSON: encoded,
        attestationObject: encoded,
        transports: z.array(z.string().max(32)).max(10).optional(),
      })
      .passthrough(),
  })
  .refine((value) => value.id === value.rawId);
const authenticationResponse = assertion
  .extend({
    response: z
      .object({
        clientDataJSON: encoded,
        authenticatorData: encoded,
        signature: encoded,
        userHandle: encoded.optional(),
      })
      .passthrough(),
  })
  .refine((value) => value.id === value.rawId);
const attemptLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many passkey attempts. Please try again later." },
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, "Invalid passkey request.");
  return result.data;
}

// Role changes also invalidate proof obtained under the investor password policy.
export function passkeySecurityStamp(user: User): string {
  return tokenHash(
    JSON.stringify([
      user.id,
      user.role,
      user.passwordHash,
      user.twoFactorEnabled,
      user.twoFactorSecret,
      user.suspended,
    ]),
  );
}

async function freshAuthentication(
  user: User,
  input: z.infer<typeof proof>,
): Promise<void> {
  if (user.role === "ADMIN") return requireTotp(user, input.code);
  if (
    !input.password ||
    !(await bcrypt.compare(input.password, user.passwordHash))
  ) {
    throw new HttpError(
      403,
      "Confirm your current password to change passkeys.",
    );
  }
}

async function currentUser(
  tx: Prisma.TransactionClient,
  user: User,
): Promise<User> {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
  const current = await tx.user.findUnique({ where: { id: user.id } });
  if (
    !current ||
    current.suspended ||
    passkeySecurityStamp(current) !== passkeySecurityStamp(user)
  )
    throw new HttpError(401, expired);
  return current;
}

async function saveChallenge(
  challenge: string,
  kind: "REGISTER" | "LOGIN",
  user: User | null,
  sessionId?: string,
) {
  // Expired challenges carry no usable proof and can be safely removed.
  await prisma.passkeyChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return prisma.passkeyChallenge.create({
    data: {
      id: randomUUID(),
      challengeHash: tokenHash(challenge),
      kind,
      userId: user?.id,
      sessionId,
      securityStamp: user ? passkeySecurityStamp(user) : undefined,
      expiresAt: new Date(Date.now() + challengeLifetime),
    },
  });
}

// The conditional update makes even concurrent assertion submissions single use.
async function consumeChallenge(
  id: string,
  kind: "REGISTER" | "LOGIN",
  req?: Request,
) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const challenge = await tx.passkeyChallenge.findUnique({ where: { id } });
    if (
      !challenge ||
      challenge.kind !== kind ||
      challenge.usedAt ||
      challenge.expiresAt <= now ||
      (kind === "REGISTER" &&
        (challenge.userId !== req?.auth?.user.id ||
          challenge.sessionId !== req?.auth?.sessionId))
    ) {
      throw new HttpError(400, expired);
    }
    const consumed = await tx.passkeyChallenge.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw new HttpError(400, expired);
    return challenge;
  });
}

export const passkeyRouter = Router();
passkeyRouter.use(attemptLimit);

passkeyRouter.get("/", requireAuth, async (req, res) => {
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId: req.auth!.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
  res.json({ credentials });
});

passkeyRouter.post("/register/options", requireAuth, async (req, res) => {
  const input = parse(proof, req.body);
  const user = req.auth!.user;
  await freshAuthentication(user, input);
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId: user.id },
  });
  if (credentials.length >= 10)
    throw new HttpError(
      409,
      "Remove an existing passkey before adding another.",
    );
  const options = await generateRegistrationOptions({
    rpName: "AUREON",
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    timeout: 60000,
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    excludeCredentials: credentials.map((key) => ({
      id: key.id,
      transports: key.transports,
    })),
  });
  // Recheck the account under its security lock before saving reauthentication proof.
  const challenge = await prisma.$transaction(async (tx) => {
    await currentUser(tx, user);
    return tx.passkeyChallenge.create({
      data: {
        id: randomUUID(),
        challengeHash: tokenHash(options.challenge),
        kind: "REGISTER",
        userId: user.id,
        sessionId: req.auth!.sessionId,
        securityStamp: passkeySecurityStamp(user),
        expiresAt: new Date(Date.now() + challengeLifetime),
      },
    });
  });
  res.json({ options, challengeId: challenge.id });
});

passkeyRouter.post("/register/verify", requireAuth, async (req, res) => {
  const input = parse(
    z.object({
      challengeId: z.string().uuid(),
      response: registrationResponse,
      label: z.string().trim().min(1).max(80),
    }),
    req.body,
  );
  const challenge = await consumeChallenge(input.challengeId, "REGISTER", req);
  const user = req.auth!.user;
  if (challenge.securityStamp !== passkeySecurityStamp(user))
    throw new HttpError(400, expired);
  let result;
  try {
    result = await verifyRegistrationResponse({
      response: input.response as RegistrationResponseJSON,
      expectedChallenge: (value) =>
        tokenHash(value) === challenge.challengeHash,
      expectedOrigin: config.appOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    throw new HttpError(
      400,
      "The passkey could not be registered. Please start again.",
    );
  }
  if (!result.verified)
    throw new HttpError(
      400,
      "The passkey could not be registered. Please start again.",
    );
  const info = result.registrationInfo;
  try {
    await prisma.$transaction(async (tx) => {
      await currentUser(tx, user);
      if (
        (await tx.passkeyCredential.count({ where: { userId: user.id } })) >= 10
      )
        throw new HttpError(
          409,
          "Remove an existing passkey before adding another.",
        );
      await tx.passkeyCredential.create({
        data: {
          id: info.credential.id,
          userId: user.id,
          publicKey: new Uint8Array(info.credential.publicKey),
          counter: BigInt(info.credential.counter),
          transports: info.credential.transports ?? [],
          label: input.label,
          deviceType: info.credentialDeviceType,
          backedUp: info.credentialBackedUp,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "AUTH_PASSKEY_ADDED",
          targetId: user.id,
          ip: req.ip,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpError(409, "This passkey has already been registered.");
    throw error;
  }
  res
    .status(201)
    .json({
      message: "Passkey added. You can use it the next time you sign in.",
    });
});

passkeyRouter.post("/login/options", async (req, res) => {
  const { email } = parse(
    z.object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    }),
    req.body,
  );
  const candidate = await prisma.user.findUnique({ where: { email } });
  const user = candidate && !candidate.suspended ? candidate : null;
  // Discoverable credentials give unknown emails and real accounts identical options.
  // Account credential IDs and two-factor status are never exposed by this endpoint.
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    timeout: 60000,
  });
  const challenge = await saveChallenge(options.challenge, "LOGIN", user);
  res.json({ options, challengeId: challenge.id });
});

passkeyRouter.post("/login/verify", async (req, res) => {
  const input = parse(
    z.object({
      challengeId: z.string().uuid(),
      response: authenticationResponse,
      code: z.string().max(20).optional(),
    }),
    req.body,
  );
  const challenge = await consumeChallenge(input.challengeId, "LOGIN");
  const user = challenge.userId
    ? await prisma.user.findUnique({ where: { id: challenge.userId } })
    : null;
  if (
    !user ||
    user.suspended ||
    challenge.securityStamp !== passkeySecurityStamp(user)
  )
    throw new HttpError(401, failure);
  if (user.twoFactorEnabled) {
    try {
      await requireTotp(user, input.code);
    } catch {
      throw new HttpError(401, failure);
    }
  }
  // Verification, counter persistence, and session creation share the User lock.
  // Revocation follows that same lock order, so a deleted key cannot create a session.
  await issueAuthSession(req, res, user, "AUTH_PASSKEY_LOGIN", async (tx) => {
    const key = await tx.passkeyCredential.findUnique({
      where: { id: input.response.id },
    });
    if (!key || key.userId !== user.id) throw new HttpError(401, failure);
    const response = input.response as AuthenticationResponseJSON;
    if (
      response.response.userHandle &&
      response.response.userHandle !==
        Buffer.from(user.id).toString("base64url")
    )
      throw new HttpError(401, failure);
    try {
      const result = await verifyAuthenticationResponse({
        response,
        expectedChallenge: (value) =>
          tokenHash(value) === challenge.challengeHash,
        expectedOrigin: config.appOrigin,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: key.id,
          publicKey: new Uint8Array(key.publicKey),
          counter: Number(key.counter),
          transports: key.transports,
        },
      });
      if (!result.verified) throw new Error("Unverified assertion");
      const info = result.authenticationInfo;
      await tx.passkeyCredential.update({
        where: { id: key.id },
        data: {
          counter: BigInt(info.newCounter),
          deviceType: info.credentialDeviceType,
          backedUp: info.credentialBackedUp,
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      // Never expose parser or cryptographic-library details to an unauthenticated client.
      if (error instanceof Prisma.PrismaClientKnownRequestError) throw error;
      throw new HttpError(401, failure);
    }
  });
  res.json({ user: await serializeUser(user) });
});

passkeyRouter.delete("/:id", requireAuth, async (req, res) => {
  const input = parse(proof, req.body);
  const id = parse(credentialId, String(req.params.id));
  const user = req.auth!.user;
  await freshAuthentication(user, input);
  await prisma.$transaction(async (tx) => {
    await currentUser(tx, user);
    const removed = await tx.passkeyCredential.deleteMany({
      where: { id, userId: user.id },
    });
    if (removed.count !== 1)
      throw new HttpError(404, "This passkey was not found.");
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "AUTH_PASSKEY_REMOVED",
        targetId: user.id,
        ip: req.ip,
      },
    });
  });
  res.json({ message: "Passkey removed." });
});
