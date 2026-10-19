ALTER TABLE "NewsletterSubscriber" ADD COLUMN "consentAt" TIMESTAMP(3), ADD COLUMN "consentVersion" TEXT, ADD COLUMN "confirmedAt" TIMESTAMP(3), ADD COLUMN "unsubscribedAt" TIMESTAMP(3), ADD COLUMN "confirmTokenHash" TEXT, ADD COLUMN "confirmExpiresAt" TIMESTAMP(3), ADD COLUMN "unsubscribeTokenHash" TEXT, ADD COLUMN "encryptedUnsubscribeToken" TEXT;
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmTokenHash_key" ON "NewsletterSubscriber"("confirmTokenHash");
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeTokenHash_key" ON "NewsletterSubscriber"("unsubscribeTokenHash");
CREATE INDEX "NewsletterSubscriber_confirmedAt_unsubscribedAt_idx" ON "NewsletterSubscriber"("confirmedAt", "unsubscribedAt");
ALTER TABLE "EmailOutbox" ALTER COLUMN "notificationId" DROP NOT NULL;
ALTER TABLE "EmailOutbox" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'ACTIVITY', ADD COLUMN "actionUrl" TEXT, ADD COLUMN "newsletterSubscriberId" TEXT, ADD COLUMN "campaignRecipientId" TEXT, ADD COLUMN "cancelledAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "EmailOutbox_campaignRecipientId_key" ON "EmailOutbox"("campaignRecipientId");
CREATE TABLE "ContentEntry" (
 "id" TEXT NOT NULL, "kind" TEXT NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "summary" TEXT NOT NULL, "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP(3), "createdById" TEXT NOT NULL, "updatedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ContentEntry_pkey" PRIMARY KEY ("id"), CONSTRAINT "ContentEntry_kind_check" CHECK ("kind" IN ('ARTICLE','ANNOUNCEMENT','FAQ')), CONSTRAINT "ContentEntry_status_check" CHECK ("status" IN ('DRAFT','PUBLISHED','ARCHIVED'))
);
CREATE UNIQUE INDEX "ContentEntry_slug_key" ON "ContentEntry"("slug");
CREATE INDEX "ContentEntry_status_kind_publishedAt_idx" ON "ContentEntry"("status", "kind", "publishedAt");
CREATE TABLE "EmailCampaign" (
 "id" TEXT NOT NULL, "title" TEXT NOT NULL, "subject" TEXT NOT NULL, "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "createdById" TEXT NOT NULL, "updatedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id"), CONSTRAINT "EmailCampaign_status_check" CHECK ("status" IN ('DRAFT','QUEUED','ARCHIVED'))
);
CREATE TABLE "CampaignRecipient" (
 "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "subscriberId" TEXT NOT NULL, "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id"), CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "CampaignRecipient_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_subscriberId_key" ON "CampaignRecipient"("campaignId", "subscriberId");
CREATE INDEX "CampaignRecipient_subscriberId_idx" ON "CampaignRecipient"("subscriberId");
