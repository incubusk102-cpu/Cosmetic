import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeBillingConfig, getStripeClient } from "@/lib/stripe/client";
import { subscriptionUpdateFromEvent } from "@/lib/stripe/events";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature on the raw request body, then handles
 * subscription lifecycle events by upserting the relevant `profiles` row
 * via the service-role client (RLS bypass — we identify the user via
 * `subscription.metadata.user_id` or via `stripe_customer_id` lookup).
 */
export async function POST(req: Request) {
  let config;
  try {
    config = getStripeBillingConfig();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  // Webhook signature verification needs the raw body bytes.
  const rawBody = await req.text();

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, config.webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Bad signature: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  try {
    await dispatchEvent(event, stripe);
  } catch (err) {
    // Return 500 so Stripe retries; the body is for our logs.
    return NextResponse.json(
      {
        error: "Failed to handle event.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function dispatchEvent(event: Stripe.Event, stripe: Stripe) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      if (!userId || !customerId) return;
      const admin = getSupabaseAdminClient();
      // Persist the customer id immediately so the Portal route works
      // even before any subscription event lands.
      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
      // Bootstrap the plan from the attached subscription if we already have one.
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscriptionUpdate(sub, userId);
      }
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await applySubscriptionUpdate(sub, sub.metadata?.user_id ?? null);
      return;
    }
    default:
      // Ignore other events — we only care about subscription lifecycle today.
      return;
  }
}

async function applySubscriptionUpdate(
  subscription: Stripe.Subscription,
  metadataUserId: string | null,
) {
  const update = subscriptionUpdateFromEvent(subscription);
  const admin = getSupabaseAdminClient();

  // Prefer the explicit metadata user_id (set during checkout). Fall back
  // to looking up the profile by stripe_customer_id, which we persist on
  // `checkout.session.completed`.
  let userId = metadataUserId;
  if (!userId) {
    const lookup = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", update.customerId)
      .maybeSingle();
    userId = lookup.data?.id ?? null;
  }
  if (!userId) return;

  await admin
    .from("profiles")
    .update({
      plan: update.plan,
      stripe_customer_id: update.customerId,
      stripe_subscription_id:
        update.plan === "free" ? null : update.subscriptionId,
      plan_renews_at: update.renewsAt,
    })
    .eq("id", userId);
}
