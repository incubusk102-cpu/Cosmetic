import type Stripe from "stripe";

export type Plan = "free" | "plus";

/**
 * Map a Stripe subscription status onto our two-state plan model.
 *
 * Stripe statuses we honor as Plus:
 *  - `active` — currently paying
 *  - `trialing` — inside a trial window
 *  - `past_due` — keeps access until the dunning sequence cancels it (grace)
 *
 * Everything else (incomplete, incomplete_expired, canceled, unpaid, paused)
 * downgrades to free.
 */
export function planFromSubscriptionStatus(
  status: Stripe.Subscription.Status,
): Plan {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
      return "plus";
    case "incomplete":
    case "incomplete_expired":
    case "canceled":
    case "unpaid":
    case "paused":
      return "free";
    default: {
      const _exhaustive: never = status;
      void _exhaustive;
      return "free";
    }
  }
}

export interface SubscriptionUpdate {
  customerId: string;
  subscriptionId: string;
  plan: Plan;
  /** ISO timestamp; null when the subscription has no period_end. */
  renewsAt: string | null;
}

/**
 * Extract the fields the webhook handler writes back to `profiles` from a
 * `customer.subscription.*` event payload.
 */
export function subscriptionUpdateFromEvent(
  subscription: Stripe.Subscription,
): SubscriptionUpdate {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const renewsAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  return {
    customerId,
    subscriptionId: subscription.id,
    plan: planFromSubscriptionStatus(subscription.status),
    renewsAt,
  };
}
