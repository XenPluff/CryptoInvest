-- Durable transactional activity-email outbox. A mail outage never reverses financial entries.
CREATE TABLE "EmailOutbox" (
 "id" TEXT PRIMARY KEY, "notificationId" TEXT NOT NULL, "recipient" TEXT NOT NULL,
 "subject" TEXT NOT NULL, "text" TEXT NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lockedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "EmailOutbox_notificationId_key" ON "EmailOutbox"("notificationId");
CREATE INDEX "EmailOutbox_sentAt_nextAttemptAt_idx" ON "EmailOutbox"("sentAt","nextAttemptAt");
