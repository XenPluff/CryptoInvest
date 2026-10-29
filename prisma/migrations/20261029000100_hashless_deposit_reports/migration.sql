ALTER TABLE "Transaction" ADD COLUMN "depositInstructionKey" TEXT;
CREATE UNIQUE INDEX "Transaction_depositInstructionKey_key" ON "Transaction"("depositInstructionKey");
