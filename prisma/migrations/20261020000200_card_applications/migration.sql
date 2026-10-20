CREATE TYPE "CardNetwork" AS ENUM ('VISA', 'MASTERCARD');
CREATE TYPE "CardFormat" AS ENUM ('PHYSICAL', 'VIRTUAL');
CREATE TYPE "CardApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE "CardApplication" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "network" "CardNetwork" NOT NULL,
  "format" "CardFormat" NOT NULL,
  "country" TEXT NOT NULL,
  "intendedUse" TEXT NOT NULL,
  "status" "CardApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "consentVersion" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewMessage" TEXT,
  CONSTRAINT "CardApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CardApplication_version_positive" CHECK ("version" > 0),
  CONSTRAINT "CardApplication_use_valid" CHECK ("intendedUse" IN ('PERSONAL', 'BUSINESS', 'BOTH'))
);
CREATE UNIQUE INDEX "CardApplication_userId_key" ON "CardApplication"("userId");
CREATE INDEX "CardApplication_status_submittedAt_idx" ON "CardApplication"("status", "submittedAt");

CREATE TABLE "CardApplicationEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "status" "CardApplicationStatus" NOT NULL,
  "version" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CardApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CardApplicationEvent_version_positive" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "CardApplicationEvent_applicationId_version_key" ON "CardApplicationEvent"("applicationId", "version");
