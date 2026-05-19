import { NextResponse } from "next/server";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeBillingConfig, getStripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/checkout?cadence=monthly|yearly
 *
 * Creates a Stripe Checkout Session for the signed-in user and 303s to it.
 * If the user already has a `stripe_customer_id`, we reuse the customer so
 * the same payment method is offered. Otherwise Stripe creates a customer
 * on completion and the webhook persists the `cus_…` id back to profiles.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let config;
  try {
    config = getStripeBillingConfig();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Billing isn't configured on this deployment. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_MONTHLY_ID.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const cadence = url.searchParams.get("cadence") === "yearly" ? "yearly" : "monthly";
  const priceId =
    cadence === "yearly" && config.yearlyPriceId
      ? config.yearlyPriceId
      : config.monthlyPriceId;

  const supabase = getSupabaseServerClient();
  const profileRes = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: profileRes.data?.stripe_customer_id ?? undefined,
    customer_email: profileRes.data?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.appUrl}/settings/account?upgraded=1`,
    cancel_url: `${config.appUrl}/settings/account?canceled=1`,
    // Stripe attaches metadata to both the session and the resulting
    // subscription, so we can find the right profile in the webhook even
    // if `customer` isn't pre-set.
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(session.url, { status: 303 });
}
