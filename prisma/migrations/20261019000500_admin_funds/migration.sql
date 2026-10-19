ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER';
CREATE TABLE "BalanceTransfer" (
  "id" TEXT PRIMARY KEY,
  "fromUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "toUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "amountCents" INTEGER NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BalanceTransfer_amount_check" CHECK ("amountCents">0),
  CONSTRAINT "BalanceTransfer_accounts_check" CHECK ("fromUserId"<>"toUserId"),
  CONSTRAINT "BalanceTransfer_status_check" CHECK ("status" IN ('PENDING','SETTLED','REJECTED'))
);
CREATE INDEX "BalanceTransfer_status_createdAt_idx" ON "BalanceTransfer"("status","createdAt");
CREATE INDEX "BalanceTransfer_fromUserId_createdAt_idx" ON "BalanceTransfer"("fromUserId","createdAt");
CREATE INDEX "BalanceTransfer_toUserId_createdAt_idx" ON "BalanceTransfer"("toUserId","createdAt");
