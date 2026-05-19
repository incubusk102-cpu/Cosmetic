"use server";

import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

export async function signOut(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Permanently delete the signed-in user's account.
 *
 * Order of operations matters:
 *  1. Look up their `stripe_subscription_id` (best-effort).
 *  2. Cancel the Stripe subscription if present — failures here are
 *     logged but non-fatal because we don't want a billing-side outage
 *     to keep someone from leaving. The Stripe webhook will eventually
 *     mirror the cancellation; orphaned subscriptions can be reconciled
 *     manually if needed.
 *  3. Delete the auth user via the service-role client. The `profiles`,
 *     `products`, `reactions`, and `user_allergens` rows are removed by
 *     ON DELETE CASCADE foreign keys in `supabase/migrations/0001_init.sql`.
 *  4. Sign the session cookies out so the client redirect lands on /login.
 */
export async function deleteAccount(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.stripe_subscription_id) {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (err) {
      // Don't block account deletion on a Stripe outage. Log so an
      // operator can reconcile the orphan subscription if Stripe was
      // actually down rather than the user being on a free plan with a
      // stale `stripe_subscription_id`.
      console.error(
        "[deleteAccount] failed to cancel Stripe subscription",
        profile.stripe_subscription_id,
        err,
      );
    }
  }

  const admin = getSupabaseAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return { ok: false, error: deleteError.message };

  await supabase.auth.signOut();
  return { ok: true };
}
