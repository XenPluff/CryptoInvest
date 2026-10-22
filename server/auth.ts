import { randomBytes, randomUUID } from "node:crypto";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { authenticator } from "otplib";
import { Prisma, type User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { config } from "./config";
import { decrypt, encrypt, randomToken, tokenHash } from "./crypto";
import { actionEmail, emailConfigured, sendEmail } from "./mail";
import { HttpError } from "./errors";

export type AuthContext = { user: User; sessionId: string };
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const sessionDuration = 7 * 24 * 60 * 60 * 1000;
const issuer = "aureon";
const audience = "aureon-web";
const totp = authenticator.clone({ window: 1 });
// A real bcrypt comparison also runs when the submitted email has no account.
const dummyHash = bcrypt.hashSync(randomBytes(32).toString("hex"), 12);
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const passwordSchema = z
  .string()
  .min(12, "Use a password with at least 12 characters.")
  .max(128, "Password must contain at most 128 characters.")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must contain at most 72 UTF-8 bytes.",
  );
const tokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "This link is invalid or expired.");
const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter a six-digit authentication code.");
const cookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: "lax" as const,
  path: "/",
};

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues[0]?.message ?? "Invalid request.",
    );
  return result.data;
}

export function publicUser(user: User, kycStatus = "NOT_SUBMITTED") {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    kycStatus,
    twoFactorEnabled: user.twoFactorEnabled,
    referralCode: user.referralCode,
  };
}

export async function serializeUser(user: User) {
  const kyc = await prisma.kycSubmission.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });
  return publicUser(user, kyc?.status);
}

function verifiedJwt(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer,
      audience,
    });
    return typeof payload !== "string" &&
      typeof payload.sub === "string" &&
      typeof payload.jti === "string"
      ? payload
      : null;
  } catch {
    return null;
  }
}

export async function issueAuthSession(
  req: Request,
  res: Response,
  user: User,
  action = "AUTH_LOGIN",
  validate?: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  const sessionId = randomUUID();
  const setupOnly = user.role === "ADMIN" && !user.twoFactorEnabled;
  const lifetime = setupOnly ? 10 * 60 * 1000 : sessionDuration;
  const token = jwt.sign({ mfa: user.twoFactorEnabled, setupOnly }, config.jwtSecret, {
    algorithm: "HS256",
    subject: user.id,
    jwtid: sessionId,
    issuer,
    audience,
    expiresIn: lifetime / 1000,
  });
  await prisma.$transaction(async (tx) => {
    // Serialize all authentication methods with password/2FA changes and suspension.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (
      !current ||
      current.suspended ||
      current.role !== user.role ||
      current.passwordHash !== user.passwordHash ||
      current.twoFactorEnabled !== user.twoFactorEnabled ||
      current.twoFactorSecret !== user.twoFactorSecret
    ) {
      throw new HttpError(
        401,
        "Account security settings changed. Please sign in again.",
      );
    }
    await validate?.(tx);
    await tx.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + lifetime),
        ip: req.ip,
        userAgent: req.get("user-agent")?.slice(0, 500),
      },
    });
    await tx.auditLog.create({
      data: { actorId: user.id, action, targetId: user.id, ip: req.ip },
    });
  });
  res.cookie(config.authCookie, token, {
    ...cookieOptions,
    maxAge: lifetime,
  });
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[config.authCookie];
    const payload = typeof token === "string" ? verifiedJwt(token) : null;
    if (!payload?.jti) throw new HttpError(401, "Please sign in to continue.");
    const session = await prisma.session.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.tokenHash !== tokenHash(token) ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.suspended
    ) {
      throw new HttpError(
        401,
        "Your session has expired. Please sign in again.",
      );
    }
    // Administrator enrollment is a short-lived, security-only session, never
    // a password-only route into investor records or the administration APIs.
    if (payload.setupOnly === true) {
      if (session.user.role !== "ADMIN" || session.user.twoFactorEnabled)
        throw new HttpError(401, "Account security settings changed. Please sign in again.");
      const path = req.originalUrl.split("?")[0];
      if (![
        "GET /api/auth/me",
        "POST /api/auth/2fa/setup",
        "POST /api/auth/2fa/enable",
      ].includes(`${req.method} ${path}`))
        throw new HttpError(403, "Complete administrator two-factor setup before continuing.");
    } else if (session.user.role === "ADMIN" &&
      (!session.user.twoFactorEnabled || payload.mfa !== true)) {
      throw new HttpError(401, "Sign in with administrator two-factor authentication to continue.");
    }
    req.auth = { user: session.user, sessionId: session.id };
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth || req.auth.user.role !== "ADMIN")
    return next(new HttpError(403, "Administrator access is required."));
  if (!req.auth.user.twoFactorEnabled)
    return next(
      new HttpError(
        403,
        "Enroll two-factor authentication in account security before accessing administration.",
      ),
    );
  try {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method))
      await requireTotp(req.auth.user, req.body?.code);
    next();
  } catch (error) { next(error); }
}

export function requireVerified(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.auth?.user.emailVerifiedAt)
    return next(new HttpError(403, "Verify your email before continuing."));
  next();
}

export async function requireTotp(
  user: Pick<User, "twoFactorEnabled" | "twoFactorSecret">,
  code: unknown,
): Promise<void> {
  if (
    !user.twoFactorEnabled ||
    !user.twoFactorSecret ||
    typeof code !== "string" ||
    !/^\d{6}$/.test(code.trim())
  ) {
    throw new HttpError(
      403,
      "A valid two-factor authentication code is required.",
    );
  }
  let valid = false;
  try {
    valid = totp.check(code.trim(), decrypt(user.twoFactorSecret));
  } catch {
    /* Fail closed if encrypted state is damaged. */
  }
  if (!valid)
    throw new HttpError(
      403,
      "A valid two-factor authentication code is required.",
    );
}

const genericMessage =
  "If your email is eligible, you will receive a message with the next steps.";
const limiter = (limit: number, windowMs: number) =>
  rateLimit({
    limit,
    windowMs,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again later." },
  });
const loginLimit = limiter(25, 15 * 60 * 1000);
const registrationLimit = limiter(8, 60 * 60 * 1000);
const emailLimit = limiter(5, 15 * 60 * 1000);
const tokenLimit = limiter(20, 15 * 60 * 1000);
const twoFactorLimit = limiter(12, 15 * 60 * 1000);

async function sendTokenEmail(
  user: Pick<User, "id" | "email">,
  kind: "VERIFY_EMAIL" | "RESET_PASSWORD",
): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(
    Date.now() +
      (kind === "VERIFY_EMAIL" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000),
  );
  await prisma.$transaction(async (tx) => {
    await tx.token.updateMany({
      where: { userId: user.id, kind, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.token.create({
      data: { userId: user.id, kind, tokenHash: tokenHash(token), expiresAt },
    });
  });
  const verification = kind === "VERIFY_EMAIL";
  const link = new URL(
    verification ? "/verify-email" : "/reset-password",
    config.appOrigin,
  );
  link.searchParams.set("token", token);
  await sendEmail({
    to: user.email,
    subject: verification
      ? "Verify your Aureon email"
      : "Reset your Aureon password",
    text: verification
      ? `Confirm your email address to continue setting up Aureon: ${link.toString()}\n\nThis single-use link expires in 24 hours. If you did not create an account, ignore this message.`
      : `Reset your Aureon password: ${link.toString()}\n\nThis single-use link expires in one hour. If you did not request a password reset, ignore this message.`,
    html: actionEmail({
      title: verification ? "Make it official." : "A fresh start, securely.",
      description: verification
        ? "Confirm your email address to finish setting up your AUREON account. Your next chapter starts with a secure foundation."
        : "We received a request to reset your AUREON password. Choose a new password using the secure link below.",
      button: verification ? "Verify email address" : "Reset your password",
      url: link.toString(),
      expiry: verification
        ? "This single-use link expires in 24 hours."
        : "This single-use link expires in one hour.",
      unsolicited: verification
        ? "If you did not create an account, you can safely ignore this email."
        : "If you did not request this reset, you can safely ignore this email. Your password has not changed.",
    }),
  });
}

export const authRouter = Router();

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await serializeUser(req.auth!.user) });
});

authRouter.post("/register", registrationLimit, async (req, res) => {
  const input = parse(
    z.object({
      name: z.string().trim().min(2).max(100),
      email: emailSchema,
      password: passwordSchema,
      referralCode: z.string().trim().max(32).optional(),
    }),
    req.body,
  );
  if (!emailConfigured)
    throw new HttpError(
      503,
      "Registration requires email delivery, which is not configured. Please contact support.",
    );
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    // Keep account existence private while allowing an unfinished signup to recover its link.
    if (!existing.emailVerifiedAt && !existing.suspended)
      await sendTokenEmail(existing, "VERIFY_EMAIL");
    res.status(202).json({ message: genericMessage });
    return;
  }
  const referrer = input.referralCode
    ? await prisma.user.findFirst({
        where: {
          referralCode: { equals: input.referralCode, mode: "insensitive" },
        },
        select: { id: true },
      })
    : null;
  if (input.referralCode && !referrer)
    throw new HttpError(400, "This referral code is not valid.");
  const passwordHash = await bcrypt.hash(input.password, 12);
  let user: User;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          referralCode: randomBytes(6).toString("hex").toUpperCase(),
          referredById: referrer?.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: "AUTH_REGISTER",
          targetId: created.id,
          ip: req.ip,
        },
      });
      return created;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(202).json({ message: genericMessage });
      return;
    }
    throw error;
  }
  await sendTokenEmail(user, "VERIFY_EMAIL");
  res.status(202).json({ message: genericMessage });
});

authRouter.post("/login", loginLimit, async (req, res) => {
  const input = parse(
    z.object({
      email: emailSchema,
      password: z.string().min(1).max(128),
      code: z.string().max(20).optional(),
    }),
    req.body,
  );
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordValid = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? dummyHash,
  );
  let valid = Boolean(user && passwordValid && !user.suspended);
  if (valid && user!.twoFactorEnabled && !input.code) {
    res.json({ requiresTwoFactor: true });
    return;
  }
  if (valid && user!.twoFactorEnabled) {
    try {
      await requireTotp(user!, input.code);
    } catch {
      valid = false;
    }
  }
  if (!valid || !user) {
    await prisma.auditLog.create({
      data: { action: "AUTH_LOGIN_FAILED", ip: req.ip },
    });
    throw new HttpError(
      401,
      "Invalid email, password, or authentication code.",
    );
  }
  await issueAuthSession(req, res, user);
  res.json({ user: await serializeUser(user), requiresTwoFactorSetup: user.role === "ADMIN" && !user.twoFactorEnabled });
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[config.authCookie];
  const payload = typeof token === "string" ? verifiedJwt(token) : null;
  if (payload?.jti)
    await prisma.session.updateMany({
      where: { id: payload.jti, tokenHash: tokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  res.clearCookie(config.authCookie, cookieOptions);
  res.json({ message: "You have been signed out." });
});

authRouter.post("/verify-email", tokenLimit, async (req, res) => {
  const { token } = parse(z.object({ token: tokenSchema }), req.body);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const record = await tx.token.findUnique({
      where: { tokenHash: tokenHash(token) },
    });
    if (
      !record ||
      record.kind !== "VERIFY_EMAIL" ||
      record.usedAt ||
      record.expiresAt <= now
    )
      throw new HttpError(
        400,
        "This link is invalid or expired. Request another verification email.",
      );
    const used = await tx.token.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (used.count !== 1)
      throw new HttpError(400, "This link is invalid or expired.");
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: now },
    });
    await tx.auditLog.create({
      data: {
        actorId: record.userId,
        action: "AUTH_EMAIL_VERIFIED",
        targetId: record.userId,
        ip: req.ip,
      },
    });
  });
  res.json({ message: "Email verified. You can now sign in." });
});

authRouter.post("/resend-verification", emailLimit, async (req, res) => {
  const { email } = parse(z.object({ email: emailSchema }), req.body);
  if (!emailConfigured)
    throw new HttpError(
      503,
      "Email delivery is not configured. Please contact support.",
    );
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt && !user.suspended)
    await sendTokenEmail(user, "VERIFY_EMAIL");
  res.json({ message: genericMessage });
});

authRouter.post("/forgot-password", emailLimit, async (req, res) => {
  const { email } = parse(z.object({ email: emailSchema }), req.body);
  if (!emailConfigured)
    throw new HttpError(
      503,
      "Email delivery is not configured. Please contact support.",
    );
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.suspended) await sendTokenEmail(user, "RESET_PASSWORD");
  res.json({ message: genericMessage });
});

authRouter.post("/reset-password", tokenLimit, async (req, res) => {
  const { token, password } = parse(
    z.object({ token: tokenSchema, password: passwordSchema }),
    req.body,
  );
  const now = new Date();
  // Hash before opening the short, atomic token-consumption transaction.
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const record = await tx.token.findUnique({
      where: { tokenHash: tokenHash(token) },
    });
    if (
      !record ||
      record.kind !== "RESET_PASSWORD" ||
      record.usedAt ||
      record.expiresAt <= now
    )
      throw new HttpError(
        400,
        "This link is invalid or expired. Request a new password reset.",
      );
    const used = await tx.token.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (used.count !== 1)
      throw new HttpError(400, "This link is invalid or expired.");
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.token.updateMany({
      where: { userId: record.userId, kind: "RESET_PASSWORD", usedAt: null },
      data: { usedAt: now },
    });
    await tx.auditLog.create({
      data: {
        actorId: record.userId,
        action: "AUTH_PASSWORD_RESET",
        targetId: record.userId,
        ip: req.ip,
      },
    });
  });
  res.clearCookie(config.authCookie, cookieOptions);
  res.json({ message: "Password updated. Sign in with your new password." });
});

authRouter.post(
  "/2fa/setup",
  requireAuth,
  requireVerified,
  twoFactorLimit,
  async (req, res) => {
    const user = req.auth!.user;
    if (user.twoFactorEnabled)
      throw new HttpError(409, "Two-factor authentication is already enabled.");
    const secret = totp.generateSecret();
    const updated = await prisma.user.updateMany({
      where: { id: user.id, twoFactorEnabled: false },
      data: { twoFactorSecret: encrypt(secret) },
    });
    if (updated.count !== 1)
      throw new HttpError(
        409,
        "Two-factor settings changed. Please try again.",
      );
    res.set("Cache-Control", "no-store");
    res.json({ secret, otpauthUrl: totp.keyuri(user.email, "Aureon", secret) });
  },
);

authRouter.post(
  "/2fa/enable",
  requireAuth,
  requireVerified,
  twoFactorLimit,
  async (req, res) => {
    const { code } = parse(z.object({ code: codeSchema }), req.body);
    const { user, sessionId } = req.auth!;
    if (user.twoFactorEnabled)
      throw new HttpError(409, "Two-factor authentication is already enabled.");
    if (!user.twoFactorSecret)
      throw new HttpError(
        400,
        "Set up an authenticator before enabling two-factor authentication.",
      );
    await requireTotp({ ...user, twoFactorEnabled: true }, code);
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          twoFactorEnabled: false,
          twoFactorSecret: user.twoFactorSecret,
          passwordHash: user.passwordHash,
          role: user.role,
          suspended: false,
        },
        data: { twoFactorEnabled: true },
      });
      if (updated.count !== 1)
        throw new HttpError(
          409,
          "Two-factor settings changed. Please start setup again.",
        );
      await tx.session.updateMany({
        where: { userId: user.id, id: { not: sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "AUTH_2FA_ENABLED",
          targetId: user.id,
          ip: req.ip,
        },
      });
    });
    if (user.role === "ADMIN") {
      await issueAuthSession(req, res, { ...user, twoFactorEnabled: true }, "AUTH_ADMIN_ENROLLMENT_COMPLETED", async tx => {
        const setup = await tx.session.findUnique({ where: { id: sessionId } });
        if (!setup || setup.revokedAt || setup.expiresAt.getTime() <= Date.now())
          throw new HttpError(401, "Your session has expired. Please sign in again.");
        await tx.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
      });
    }
    res.json({ message: "Two-factor authentication enabled." });
  },
);

authRouter.post(
  "/2fa/disable",
  requireAuth,
  requireVerified,
  twoFactorLimit,
  async (req, res) => {
    const { user, sessionId } = req.auth!;
    if (user.role === "ADMIN")
      throw new HttpError(403, "Two-factor authentication is mandatory for administrator accounts and cannot be disabled here.");
    const { password } = parse(
      z.object({ password: z.string().min(1).max(128) }),
      req.body,
    );
    if (!(await bcrypt.compare(password, user.passwordHash)))
      throw new HttpError(403, "Your current password is incorrect.");
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          twoFactorEnabled: true,
          twoFactorSecret: user.twoFactorSecret,
          passwordHash: user.passwordHash,
          role: "USER",
          suspended: false,
        },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });
      if (updated.count !== 1)
        throw new HttpError(
          409,
          "Two-factor settings changed. Please try again.",
        );
      await tx.session.updateMany({
        where: { userId: user.id, id: { not: sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "AUTH_2FA_DISABLED",
          targetId: user.id,
          ip: req.ip,
        },
      });
    });
    res.json({ message: "Two-factor authentication disabled." });
  },
);
