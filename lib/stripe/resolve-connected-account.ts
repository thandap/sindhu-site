
import { prisma } from "@/lib/db/prisma";
import { stripeV2 } from "@/lib/stripe-v2";
import { createV2ConnectedAccount } from "@/lib/stripe/create-v2-account";

export type OnboardingMethod = "SELF_SERVICE" | "ASSISTED";

export class StripeOnboardingError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 409
  ) {
    super(message);
    this.name = "StripeOnboardingError";
  }
}

export async function resolveConnectedAccount(
  tenantSlug: string,
  onboardingMethod: OnboardingMethod
): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant || !tenant.isActive) {
    throw new StripeOnboardingError(
      "Active restaurant tenant not found",
      404
    );
  }

  let accountId = tenant.stripeAccountId;

  let operation =
    await prisma.stripeOnboardingOperation.findUnique({
      where: { tenantId: tenant.id },
    });

  // Never proceed with uncertain creation outcomes.
  if (
    operation?.status === "CREATING" ||
    operation?.status === "REVIEW_REQUIRED"
  ) {
    throw new StripeOnboardingError(
      "Stripe account requires manual reconciliation"
    );
  }

  if (
    operation?.stripeAccountId &&
    accountId &&
    operation.stripeAccountId !== accountId
  ) {
    throw new StripeOnboardingError(
      "Conflicting Stripe account IDs"
    );
  }

  // Recover an account already created in Stripe.
  if (
    operation?.status === "CREATED" &&
    operation.stripeAccountId &&
    !accountId
  ) {
    const account = await stripeV2.v2.core.accounts.retrieve(
      operation.stripeAccountId
    );

    if (
      account.metadata?.tenantId !== tenant.id ||
      account.metadata?.tenantSlug !== tenant.slug
    ) {
      throw new StripeOnboardingError(
        "Stripe account ownership mismatch"
      );
    }

    const attached = await prisma.tenant.updateMany({
      where: {
        id: tenant.id,
        stripeAccountId: null,
      },
      data: {
        stripeAccountId: account.id,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
      },
    });

    if (attached.count !== 1) {
      const latestTenant = await prisma.tenant.findUnique({
        where: { id: tenant.id },
        select: { stripeAccountId: true },
      });

      if (latestTenant?.stripeAccountId !== account.id) {
        throw new StripeOnboardingError(
          "Unable to reconcile Stripe account"
        );
      }
    }

    accountId = account.id;
  }

  if (operation?.status === "CREATED" && !operation.stripeAccountId) {
    throw new StripeOnboardingError(
      "Stripe operation missing account ID"
    );
  }


  // Existing account: verify ownership before reuse.
  if (accountId) {
    const account = await stripeV2.v2.core.accounts.retrieve(accountId);

    if (
      account.metadata?.tenantId !== tenant.id ||
      account.metadata?.tenantSlug !== tenant.slug
    ) {
      throw new StripeOnboardingError(
        "Existing Stripe account ownership could not be verified. Manual review required."
      );
    }

    return account.id;
  }


  // Initialize the persistent operation if necessary.
  if (!operation) {
    await prisma.stripeOnboardingOperation.createMany({
      data: [
        {
          tenantId: tenant.id,
          idempotencyKey: `resto-connect-${tenant.id}`,
          status: "PENDING",
          onboardingMethod,
        },
      ],
      skipDuplicates: true,
    });

    operation =
      await prisma.stripeOnboardingOperation.findUnique({
        where: { tenantId: tenant.id },
      });
  }

  if (!operation) {
    throw new StripeOnboardingError(
      "Unable to initialize Stripe onboarding"
    );
  }

  const claim = await prisma.stripeOnboardingOperation.updateMany({
    where: {
      id: operation.id,
      status: "PENDING",
    },
    data: {
      status: "CREATING",
      onboardingMethod,
      lastError: null,
    },
  });

  if (claim.count !== 1) {
    throw new StripeOnboardingError(
      "Stripe onboarding is already in progress or requires review"
    );
  }

  try {
    const accountId = await createV2ConnectedAccount({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      contactEmail: process.env.STRIPE_TEST_ONBOARDING_EMAIL ?? "",
      idempotencyKey: `${operation.idempotencyKey}-v2`,
    });

    // Record the Stripe account ID before attaching it.
    await prisma.stripeOnboardingOperation.update({
      where: { id: operation.id },
      data: {
        stripeAccountId: accountId,
        status: "CREATED",
      },
    });

    const attached = await prisma.tenant.updateMany({
      where: {
        id: tenant.id,
        stripeAccountId: null,
      },
      data: {
        stripeAccountId: accountId,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
      },
    });

    if (attached.count !== 1) {
      throw new StripeOnboardingError(
        "Tenant account changed during Stripe creation"
      );
    }

    return accountId;
  } catch (error) {
    // Do not retry automatically. The account may exist.
    await prisma.stripeOnboardingOperation.updateMany({
      where: {
        id: operation.id,
        status: "CREATING",
      },
      data: {
        status: "REVIEW_REQUIRED",
        lastError:
          "Stripe account creation outcome requires reconciliation",
      },
    });

    throw error;
  }
}
