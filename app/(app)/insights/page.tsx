import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const [{ count: scans }, { count: reactions }, { count: saved }] = await Promise.all([
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
  ]);

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
        <CardTitle>Coming soon</CardTitle>
        <CardDescription>
          Correlations between reactions and ingredients, a 12-month dermatologist-ready PDF, and
          re-check alerts when a saved product&apos;s formula changes.
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
