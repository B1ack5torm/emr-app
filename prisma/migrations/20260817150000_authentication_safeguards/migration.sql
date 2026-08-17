ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT,
  "identityHash" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "succeeded" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoginAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LoginAttempt_identityHash_ipHash_createdAt_idx" ON "LoginAttempt"("identityHash", "ipHash", "createdAt");
CREATE INDEX "LoginAttempt_organizationId_createdAt_idx" ON "LoginAttempt"("organizationId", "createdAt");
