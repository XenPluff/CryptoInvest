import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 14 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    throw new Error(
      "Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 14 characters through a secure environment.",
    );
  if (await prisma.user.findUnique({ where: { email } }))
    throw new Error(
      "An account already exists for this email. Refusing to overwrite credentials or elevate an existing user.",
    );
  await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME || "Platform administrator",
      email,
      passwordHash: await hash(password, 12),
      role: "ADMIN",
      emailVerifiedAt: new Date(),
      referralCode: randomBytes(8).toString("hex").toUpperCase(),
    },
  });
  console.log(
    "Administrator created. Enroll TOTP in account security before financial administration.",
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Administrator creation failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
