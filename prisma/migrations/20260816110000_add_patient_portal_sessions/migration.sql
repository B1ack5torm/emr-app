CREATE TABLE "PatientPortalSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "PatientPortalSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientPortalSession_tokenHash_key" ON "PatientPortalSession"("tokenHash");
CREATE INDEX "PatientPortalSession_accountId_idx" ON "PatientPortalSession"("accountId");

ALTER TABLE "PatientPortalSession" ADD CONSTRAINT "PatientPortalSession_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "PatientPortalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
