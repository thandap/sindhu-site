-- AlterTable
ALTER TABLE "StripeOnboardingInvitation" ADD COLUMN     "claimId" TEXT,
ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "StripeOnboardingInvitation_claimId_key" ON "StripeOnboardingInvitation"("claimId");
