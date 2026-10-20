import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

export class AdminProvisioningError extends Error {}

/** Operator-only entry point. No HTTP route calls this function. */
export async function promoteAdministrator(db: PrismaClient, address: string) {
  const parsed = z.string().trim().email().max(254).safeParse(address);
  if (!parsed.success)
    throw new AdminProvisioningError("Set ADMIN_EMAIL to the intended account's email address.");
  const email = parsed.data.toLowerCase();
  return db.$transaction(async (tx) => {
    const candidate = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (!candidate)
      throw new AdminProvisioningError("The account does not exist. Register and verify it first.");
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${candidate.id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: candidate.id } });
    if (!user || user.suspended)
      throw new AdminProvisioningError("A suspended or unavailable account cannot be promoted.");
    if (!user.emailVerifiedAt)
      throw new AdminProvisioningError("Verify the account's email before assigning administrator access.");
    if (user.role === "ADMIN") return { promoted: false };

    const now = new Date();
    await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    const sessions = await tx.session.updateMany({
      where: { userId: user.id, revokedAt: null }, data: { revokedAt: now },
    });
    await tx.token.updateMany({
      where: { userId: user.id, kind: "RESET_PASSWORD", usedAt: null },
      data: { usedAt: now },
    });
    await tx.auditLog.create({ data: {
      action: "ADMIN_ROLE_GRANTED", targetId: user.id,
      metadata: {
        source: "operator_cli", previousRole: user.role, role: "ADMIN",
        sessionsRevoked: sessions.count,
      },
    } });
    return { promoted: true };
  });
}
