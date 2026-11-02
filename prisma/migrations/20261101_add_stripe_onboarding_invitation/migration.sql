-- CreateTable
CREATE TABLE "StripeOnboardingInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'SELF_SERVICE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeOnboardingInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeOnboardingInvitation_tokenHash_key" ON "StripeOnboardingInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "StripeOnboardingInvitation_tenantId_idx" ON "StripeOnboardingInvitation"("tenantId");

-- CreateIndex
CREATE INDEX "StripeOnboardingInvitation_expiresAt_idx" ON "StripeOnboardingInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "StripeOnboardingInvitation" ADD CONSTRAINT "StripeOnboardingInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
