ALTER TABLE "Transaction" ADD COLUMN "direction" TEXT
  CHECK ("direction" IS NULL OR "direction" IN ('CREDIT','DEBIT'));
