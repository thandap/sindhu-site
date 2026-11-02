import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

/**
 * Dedicated Stripe client for Accounts v2.
 * Keeps the existing Checkout integration unchanged.
 */
export const stripeV2 = new Stripe(
  process.env.STRIPE_SECRET_KEY,
  {
    // @ts-expect-error Stripe SDK v22 types may not include this preview version
    apiVersion: "2026-10-28.preview",
  }
);