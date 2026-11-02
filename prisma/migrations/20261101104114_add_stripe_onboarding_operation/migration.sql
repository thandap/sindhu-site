-- CreateTable
CREATE TABLE "StripeOnboardingOperation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeAccountId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeOnboardingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeOnboardingOperation_tenantId_key" ON "StripeOnboardingOperation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeOnboardingOperation_idempotencyKey_key" ON "StripeOnboardingOperation"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "StripeOnboardingOperation" ADD CONSTRAINT "StripeOnboardingOperation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
