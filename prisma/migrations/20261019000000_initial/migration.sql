-- Initial schema. Account balances are computed from append-only, integer-cent ledger entries.
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "TokenKind" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT','WITHDRAWAL','INVESTMENT','RETURN','REFERRAL','ADJUSTMENT');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING','APPROVED','REJECTED','PAID','ACTIVE','SETTLED');
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE','SETTLED');
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'USER',
  "emailVerifiedAt" TIMESTAMP(3), "suspended" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT, "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "referralCode" TEXT NOT NULL, "referredById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");
CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "ip" TEXT, "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId","expiresAt");
CREATE TABLE "Token" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "kind" "TokenKind" NOT NULL,
  "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Token_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Token_tokenHash_key" ON "Token"("tokenHash");
CREATE INDEX "Token_userId_kind_idx" ON "Token"("userId","kind");
CREATE TABLE "Plan" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "dailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0, "monthlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minCents" INTEGER NOT NULL, "maxCents" INTEGER NOT NULL, "durationDays" INTEGER NOT NULL,
  "description" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_amounts_check" CHECK("minCents">0 AND "maxCents">="minCents" AND "durationDays">0),
  CONSTRAINT "Plan_rates_check" CHECK("dailyRate">=0 AND "monthlyRate">=0 AND NOT("dailyRate">0 AND "monthlyRate">0))
);
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE TABLE "Wallet" (
  "id" TEXT PRIMARY KEY, "asset" TEXT NOT NULL, "network" TEXT NOT NULL, "address" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX "Wallet_asset_network_key" ON "Wallet"("asset","network");
CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "type" "TransactionType" NOT NULL,
  "amountCents" INTEGER NOT NULL, "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "asset" TEXT, "network" TEXT, "txHash" TEXT, "walletId" TEXT, "address" TEXT, "note" TEXT,
  "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Transaction_amount_check" CHECK("amountCents">=0)
);
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId","createdAt");
CREATE INDEX "Transaction_type_status_createdAt_idx" ON "Transaction"("type","status","createdAt");
CREATE TABLE "LedgerEntry" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "amountCents" INTEGER NOT NULL,
  "kind" TEXT NOT NULL, "referenceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LedgerEntry_referenceId_kind_key" ON "LedgerEntry"("referenceId","kind");
CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId","createdAt");
CREATE TABLE "Investment" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "planId" TEXT NOT NULL,
  "planName" TEXT NOT NULL, "planSlug" TEXT NOT NULL, "principalCents" INTEGER NOT NULL,
  "dailyRate" DOUBLE PRECISION NOT NULL, "monthlyRate" DOUBLE PRECISION NOT NULL, "durationDays" INTEGER NOT NULL,
  "startTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "InvestmentStatus" NOT NULL DEFAULT 'ACTIVE', "earnedCents" INTEGER NOT NULL DEFAULT 0, "settledAt" TIMESTAMP(3),
  CONSTRAINT "Investment_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Investment_planId_fkey" FOREIGN KEY("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Investment_amounts_check" CHECK("principalCents">0 AND "earnedCents">=0 AND "durationDays">0)
);
CREATE INDEX "Investment_userId_status_idx" ON "Investment"("userId","status");
CREATE TABLE "KycSubmission" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "encryptedPayload" TEXT NOT NULL,
  "country" TEXT NOT NULL, "documentType" TEXT NOT NULL, "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT, "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KycSubmission_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "KycSubmission_userId_key" ON "KycSubmission"("userId");
CREATE INDEX "KycSubmission_status_createdAt_idx" ON "KycSubmission"("status","createdAt");
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId","createdAt");
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY, "actorId" TEXT, "action" TEXT NOT NULL, "targetId" TEXT,
  "metadata" JSONB, "ip" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "ContactMessage" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "NewsletterSubscriber" (
  "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
CREATE TABLE "Setting" ("key" TEXT PRIMARY KEY,"value" TEXT NOT NULL,"updatedAt" TIMESTAMP(3) NOT NULL);
-- Reconciliation corrections must be new compensating entries. Application roles must not own this trigger.
CREATE FUNCTION prevent_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Ledger entries are immutable; record a compensating entry instead'; END;
$$;
CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON "LedgerEntry" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
