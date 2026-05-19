import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  planFromSubscriptionStatus,
  subscriptionUpdateFromEvent,
} from "./events";

describe("planFromSubscriptionStatus", () => {
  it("treats active/trialing/past_due as plus (with grace)", () => {
    expect(planFromSubscriptionStatus("active")).toBe("plus");
    expect(planFromSubscriptionStatus("trialing")).toBe("plus");
    expect(planFromSubscriptionStatus("past_due")).toBe("plus");
  });

  it("treats every other status as free", () => {
    const downgrades: Stripe.Subscription.Status[] = [
      "incomplete",
      "incomplete_expired",
      "canceled",
      "unpaid",
      "paused",
    ];
    for (const status of downgrades) {
      expect(planFromSubscriptionStatus(status)).toBe("free");
    }
  });
});

function fakeSubscription(
  overrides: Partial<Stripe.Subscription>,
): Stripe.Subscription {
  return {
    id: "sub_test_123",
    customer: "cus_test_abc",
    status: "active",
    current_period_end: 1_750_000_000,
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("subscriptionUpdateFromEvent", () => {
  it("maps an active sub to plus with the period end as renewsAt", () => {
    const update = subscriptionUpdateFromEvent(fakeSubscription({}));
    expect(update).toEqual({
      customerId: "cus_test_abc",
      subscriptionId: "sub_test_123",
      plan: "plus",
      renewsAt: new Date(1_750_000_000 * 1000).toISOString(),
    });
  });

  it("maps a canceled sub to free", () => {
    const update = subscriptionUpdateFromEvent(
      fakeSubscription({ status: "canceled" }),
    );
    expect(update.plan).toBe("free");
    expect(update.subscriptionId).toBe("sub_test_123");
  });

  it("accepts an expanded customer object", () => {
    const update = subscriptionUpdateFromEvent(
      fakeSubscription({
        customer: { id: "cus_expanded" } as Stripe.Customer,
      }),
    );
    expect(update.customerId).toBe("cus_expanded");
  });

  it("returns renewsAt=null when current_period_end is missing", () => {
    const update = subscriptionUpdateFromEvent(
      fakeSubscription({ current_period_end: 0 }),
    );
    expect(update.renewsAt).toBe(null);
  });
});
