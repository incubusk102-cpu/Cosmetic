import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { currentPdfExportPeriod } from "@/lib/pdf/quota";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const [{ count: scans }, { count: reactions }, { count: saved }, profileRes] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("reactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_saved", true),
      supabase
        .from("profiles")
        .select("plan, pdf_exports_used_this_month, pdf_exports_period")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const plan = profileRes.data?.plan ?? "free";
  const currentPeriod = currentPdfExportPeriod();
  const usedThisMonth =
    profileRes.data?.pdf_exports_period === currentPeriod
      ? (profileRes.data?.pdf_exports_used_this_month ?? 0)
      : 0;
  const freeQuotaRemaining = plan === "plus" ? Infinity : Math.max(0, 1 - usedThisMonth);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Insights</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">Insights</h1>
        <p className="text-sm text-ink-muted">
          A glance at your activity. More analysis lands soon.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Products scanned" value={scans ?? 0} />
        <StatCard label="Reactions logged" value={reactions ?? 0} />
        <StatCard label="Saved" value={saved ?? 0} />
      </div>

      <Card>
        <CardTitle>Personal reaction log (PDF)</CardTitle>
        <CardDescription>
          Your last 12 months of scanned products and reactions, ready to hand to
          a dermatologist. Informational only — not a medical record.
        </CardDescription>
        <div className="mt-4 flex flex-col items-start gap-2">
          {plan === "plus" ? (
            <a href="/api/export/pdf" className="contents">
              <Button size="lg">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
          ) : freeQuotaRemaining > 0 ? (
            <>
              <a href="/api/export/pdf" className="contents">
                <Button size="lg">
                  <Download className="h-4 w-4" />
                  Download PDF (free, 1/month)
                </Button>
              </a>
              <p className="text-xs text-ink-muted">
                Free accounts get one export per month. Plus unlocks unlimited.
              </p>
            </>
          ) : (
            <>
              <Button size="lg" disabled>
                <Download className="h-4 w-4" />
                Monthly export already used
              </Button>
              <p className="text-xs text-ink-muted">
                Your free export resets next month. Plus unlocks unlimited exports.
              </p>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Coming soon</CardTitle>
        <CardDescription>
          Reaction-to-ingredient correlations and re-check alerts when a saved
          product&apos;s formula changes.
        </CardDescription>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper-raised p-4 shadow-soft">
      <p className="font-serif text-3xl tabular text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
