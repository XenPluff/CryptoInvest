import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { AdminProvisioningError, promoteAdministrator } from "../server/admin-provisioning";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
promoteAdministrator(db, process.env.ADMIN_EMAIL ?? "")
  .then(({ promoted }) => console.log(promoted
    ? "Administrator access granted. Sign in again and enroll an authenticator before financial administration."
    : "The selected account already has administrator access; no changes made.",
  ))
  .catch((error: unknown) => {
    console.error(error instanceof AdminProvisioningError
      ? error.message : "Administrator promotion failed. Check the database and operator configuration.");
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await db.$disconnect(); }
    catch { console.error("Administrator setup database cleanup failed."); process.exitCode = 1; }
  });
