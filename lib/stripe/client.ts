import Stripe from "stripe";

/**
 * Lazy server-side Stripe client. We never want to throw at module-import
 * time (the build runs without secrets), so callers always go through
 * `getStripeClient()` which throws only on first use.
 */
let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure it in your environment to enable billing.",
    );
  }
  cached = new Stripe(key, {
    // Pin an API version so behavior is reproducible across server restarts.
    apiVersion: "2025-02-24.acacia",
  });
  return cached;
}

export interface StripeBillingConfig {
  monthlyPriceId: string;
  yearlyPriceId: string | null;
  webhookSecret: string;
  appUrl: string;
}

export function getStripeBillingConfig(): StripeBillingConfig {
  const monthly = process.env.STRIPE_PRICE_MONTHLY_ID;
  const yearly = process.env.STRIPE_PRICE_YEARLY_ID ?? null;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!monthly) {
    throw new Error(
      "STRIPE_PRICE_MONTHLY_ID is not set. Add it to your environment.",
    );
  }
  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. Add it to your environment.",
    );
  }
  return { monthlyPriceId: monthly, yearlyPriceId: yearly, webhookSecret, appUrl };
}
