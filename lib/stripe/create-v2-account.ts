import { stripeV2 } from "@/lib/stripe-v2";

type CreateV2AccountInput = {
  tenantId: string;
  tenantSlug: string;
  contactEmail: string;
  idempotencyKey: string;
};

export async function createV2ConnectedAccount({
  tenantId,
  tenantSlug,
  contactEmail,
  idempotencyKey,
}: CreateV2AccountInput): Promise<string> {

  // STEP 1: Restrict account creation to Stripe test mode.
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey?.startsWith("sk_test_")) {
    throw new Error(
      "Accounts v2 onboarding is restricted to Stripe test mode"
    );
  }

  // STEP 2: Use only our configured test email.
  const configuredTestEmail =
    process.env.STRIPE_TEST_ONBOARDING_EMAIL;

  if (
    !configuredTestEmail ||
    contactEmail !== configuredTestEmail
  ) {
    throw new Error(
      "A configured Stripe test onboarding email is required"
    );
  }

  // STEP 3: Create the Stripe Accounts v2 connected account.
  const account = await stripeV2.v2.core.accounts.create(
    {
      contact_email: contactEmail,
      display_name: tenantSlug,

      dashboard: "express",

      identity: {
        country: "US",
      },

      configuration: {
        merchant: {
          capabilities: {
            card_payments: {
              requested: true,
            },
          },
        },

        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                requested: true,
              },
            },
          },
        },
      },

      defaults: {
        responsibilities: {
          fees_collector: "stripe",
          losses_collector: "stripe",
        },
      },

      metadata: {
        tenantId,
        tenantSlug,
      },
    },
    {
      idempotencyKey,
    }
  );

  return account.id;
}