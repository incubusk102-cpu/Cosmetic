import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { AccountActions } from "./AccountActions";
import { StripeButtons } from "./StripeButtons";

export const metadata = { title: "Account" };

function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_MONTHLY_ID,
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toISOString().slice(0, 10);
}

interface SearchParams {
  upgraded?: string;
  canceled?: string;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const profileRes = await supabase
    .from("profiles")
    .select("plan, stripe_customer_id, stripe_subscription_id, plan_renews_at")
    .eq("id", user.id)
    .maybeSingle();

  const plan = profileRes.data?.plan ?? "free";
  const hasCustomerRecord = Boolean(profileRes.data?.stripe_customer_id);
  const planRenewsAt = formatDate(profileRes.data?.plan_renews_at ?? null);
  const billingConfigured = isBillingConfigured();

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Account</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">Account</h1>
        <p className="text-sm text-ink-muted">{user.email}</p>
      </header>

      {searchParams.upgraded ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-ink">
          You&apos;re on Plus. Webhooks land within a few seconds — refresh if your
          plan still shows Free.
        </div>
      ) : null}
      {searchParams.canceled ? (
        <div className="rounded-xl border border-ink/10 bg-paper-raised px-4 py-3 text-sm text-ink-muted">
          Checkout canceled. No charge.
        </div>
      ) : null}

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Plan</CardTitle>
            <CardDescription>
              {plan === "plus" ? (
                <>
                  You&apos;re on Plus.
                  {planRenewsAt ? ` Renews ${planRenewsAt}.` : ""}
                </>
              ) : (
                "Free plan: 1 PDF export / month. Plus unlocks unlimited exports and ingredient correlations."
              )}
            </CardDescription>
          </div>
          <span
            className={
              plan === "plus"
                ? "rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
                : "rounded-full bg-ink/10 px-3 py-1 text-xs font-medium text-ink-soft"
            }
          >
            {plan === "plus" ? "Plus" : "Free"}
          </span>
        </div>
        <div className="mt-4">
          <StripeButtons
            plan={plan}
            hasCustomerRecord={hasCustomerRecord}
            billingConfigured={billingConfigured}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Data export</CardTitle>
        <CardDescription>
          Download a JSON archive of your allergens, products, and reactions. Coming soon — for now
          contact support and we&apos;ll generate it manually.
        </CardDescription>
      </Card>

      <AccountActions />
    </div>
  );
}
