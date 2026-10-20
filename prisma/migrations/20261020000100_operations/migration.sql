CREATE TABLE "OperationalAlert" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actionPath" TEXT NOT NULL,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastNotifiedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedById" TEXT
);
CREATE UNIQUE INDEX "OperationalAlert_key_key" ON "OperationalAlert"("key");
CREATE INDEX "OperationalAlert_resolvedAt_openedAt_idx" ON "OperationalAlert"("resolvedAt", "openedAt");
CREATE TABLE "BackupRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slot" TEXT NOT NULL,
  "storage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "keyFingerprint" TEXT NOT NULL,
  "objectKey" TEXT,
  "sha256" TEXT,
  "sizeBytes" INTEGER,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "BackupRun_slot_key" ON "BackupRun"("slot");
CREATE INDEX "BackupRun_storage_status_startedAt_idx" ON "BackupRun"("storage", "status", "startedAt");
