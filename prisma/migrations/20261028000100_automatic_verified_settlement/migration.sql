CREATE TABLE "VerifiedInvestmentSettlement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "investmentId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'FINAL',
  "principalReturnedCents" INTEGER NOT NULL,
  "realizedEarningsCents" INTEGER NOT NULL,
  "externalReference" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "verifiedById" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "VerifiedInvestmentSettlement_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VerifiedInvestmentSettlement_nonnegative" CHECK ("principalReturnedCents" >= 0 AND "realizedEarningsCents" >= 0),
  CONSTRAINT "VerifiedInvestmentSettlement_kind_valid" CHECK ("kind" IN ('PROFIT', 'FINAL') AND ("kind" = 'FINAL' OR ("principalReturnedCents" = 0 AND "realizedEarningsCents" > 0)))
);
CREATE UNIQUE INDEX "VerifiedInvestmentSettlement_investmentId_externalReference_key" ON "VerifiedInvestmentSettlement"("investmentId", "externalReference");
CREATE UNIQUE INDEX "VerifiedInvestmentSettlement_final_key" ON "VerifiedInvestmentSettlement"("investmentId") WHERE "kind" = 'FINAL';
CREATE INDEX "VerifiedInvestmentSettlement_processedAt_verifiedAt_idx" ON "VerifiedInvestmentSettlement"("processedAt", "verifiedAt");
