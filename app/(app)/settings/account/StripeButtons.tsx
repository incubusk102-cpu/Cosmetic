"use client";

import { useState } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  plan: "free" | "plus";
  /** True when a stripe_customer_id is already on file (portal is reachable). */
  hasCustomerRecord: boolean;
  /** True when the deployment has STRIPE_SECRET_KEY/Webhook/Price configured. */
  billingConfigured: boolean;
}

/**
 * Renders the upgrade buttons (free → plus) or the manage-billing button
 * (plus → portal). Each button submits a POST to the corresponding route
 * handler and the browser follows the 303 to Stripe-hosted UI.
 */
export function StripeButtons({ plan, hasCustomerRecord, billingConfigured }: Props) {
  const [pending, setPending] = useState<"monthly" | "yearly" | "portal" | null>(
    null,
  );

  async function go(href: string, kind: "monthly" | "yearly" | "portal") {
    if (pending) return;
    setPending(kind);
    // We use a form submission so the browser follows the 303 to Stripe.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = href;
    document.body.appendChild(form);
    form.submit();
  }

  if (!billingConfigured) {
    return (
      <p className="text-sm text-ink-muted">
        Billing isn&apos;t configured on this deployment yet. Set STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_MONTHLY_ID, then redeploy.
      </p>
    );
  }

  if (plan === "plus") {
    return (
      <Button
        onClick={() => go("/api/stripe/portal", "portal")}
        disabled={!hasCustomerRecord || pending !== null}
        variant="secondary"
      >
        <CreditCard className="h-4 w-4" />
        {pending === "portal" ? "Opening portal…" : "Manage billing"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => go("/api/stripe/checkout?cadence=monthly", "monthly")}
        disabled={pending !== null}
        size="lg"
      >
        <Sparkles className="h-4 w-4" />
        {pending === "monthly" ? "Opening checkout…" : "Upgrade — monthly"}
      </Button>
      <Button
        onClick={() => go("/api/stripe/checkout?cadence=yearly", "yearly")}
        disabled={pending !== null}
        size="lg"
        variant="secondary"
      >
        {pending === "yearly" ? "Opening checkout…" : "Upgrade — yearly"}
      </Button>
    </div>
  );
}
