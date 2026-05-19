import { NextResponse } from "next/server";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeBillingConfig, getStripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/portal
 *
 * Creates a one-time Stripe Customer Portal link for the signed-in user
 * and 303s to it. Requires the user to already have a `stripe_customer_id`
 * on their profile — i.e. they've completed checkout at least once.
 */
export async function POST() {
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
        error: "Billing isn't configured on this deployment.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }

  const supabase = getSupabaseServerClient();
  const profileRes = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profileRes.data?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "You don't have a billing account yet. Upgrade to Plus first.",
      },
      { status: 404 },
    );
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: profileRes.data.stripe_customer_id,
    return_url: `${config.appUrl}/settings/account`,
  });

  return NextResponse.redirect(session.url, { status: 303 });
}
