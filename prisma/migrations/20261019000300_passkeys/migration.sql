CREATE TYPE "PasskeyChallengeKind" AS ENUM ('REGISTER', 'LOGIN');

CREATE TABLE "PasskeyCredential" (
 "id" TEXT PRIMARY KEY,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "publicKey" BYTEA NOT NULL,
 "counter" BIGINT NOT NULL DEFAULT 0,
 "transports" TEXT[] NOT NULL,
 "deviceType" TEXT NOT NULL,
 "backedUp" BOOLEAN NOT NULL,
 "label" TEXT NOT NULL,
 "lastUsedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PasskeyCredential_counter_nonnegative" CHECK ("counter" >= 0)
);
CREATE INDEX "PasskeyCredential_userId_idx" ON "PasskeyCredential"("userId");

CREATE TABLE "PasskeyChallenge" (
 "id" TEXT PRIMARY KEY,
 "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "sessionId" TEXT,
 "kind" "PasskeyChallengeKind" NOT NULL,
 "challengeHash" TEXT NOT NULL,
 "securityStamp" TEXT,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PasskeyChallenge_expiresAt_idx" ON "PasskeyChallenge"("expiresAt");
CREATE INDEX "PasskeyChallenge_userId_kind_idx" ON "PasskeyChallenge"("userId", "kind");
