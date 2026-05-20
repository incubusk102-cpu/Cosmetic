import { redirect } from "next/navigation";
import { Download, Info, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { currentPdfExportPeriod } from "@/lib/pdf/quota";
import {
  STRUCTURAL_FILTER,
  computeCorrelations,
  type CorrelationInputProduct,
} from "@/lib/insights/correlations";

const METHODOLOGY_URL =
  "https://github.com/incubusk102-cpu/Cosmetic/blob/devin/1779212353-mvp-scaffold/docs/METHODOLOGY.md";

export const metadata = { title: "Insights" };

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const windowStartsAt = new Date(Date.now() - ONE_YEAR_MS).toISOString();

  const [
    { count: scans },
    { count: reactions },
    { count: saved },
    profileRes,
    productsRes,
    reactionsRes,
  ] = await Promise.all([
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
    supabase
      .from("products")
      .select("id, ingredients_raw")
      .eq("user_id", user.id)
      .gte("scanned_at", windowStartsAt),
    supabase
      .from("reactions")
      .select("product_id")
      .eq("user_id", user.id)
      .gte("occurred_at", windowStartsAt)
      .not("product_id", "is", null),
  ]);

  const plan = profileRes.data?.plan ?? "free";
  const currentPeriod = currentPdfExportPeriod();
  const usedThisMonth =
    profileRes.data?.pdf_exports_period === currentPeriod
      ? (profileRes.data?.pdf_exports_used_this_month ?? 0)
      : 0;
  const freeQuotaRemaining = plan === "plus" ? Infinity : Math.max(0, 1 - usedThisMonth);

  const products: CorrelationInputProduct[] = (productsRes.data ?? []).map(
    (row) => ({ id: row.id, ingredients_raw: row.ingredients_raw }),
  );
  const reactedProductIds = (reactionsRes.data ?? [])
    .map((r) => r.product_id)
    .filter((id): id is string => Boolean(id));
  const correlations = computeCorrelations(products, reactedProductIds);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Insights</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">Insights</h1>
        <p className="text-sm text-ink-muted">
          A glance at your activity, plus the patterns we&apos;re starting to see.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Products scanned" value={scans ?? 0} />
        <StatCard label="Reactions logged" value={reactions ?? 0} />
        <StatCard label="Saved" value={saved ?? 0} />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Top suspicious ingredients</CardTitle>
            <CardDescription>
              Based on which ingredients appear more often in products that
              triggered a reaction than in those that didn&apos;t. Pattern only —
              not a diagnosis.
            </CardDescription>
          </div>
          {plan === "free" ? (
            <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-medium text-ink-soft">
              Plus
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          {plan !== "plus" ? (
            <PlusGate />
          ) : !correlations.eligible ? (
            <NotEnoughData reason={correlations.reason ?? "no_lift_signal"} />
          ) : (
            <CorrelationsTable rows={correlations.top} baseRate={correlations.baseRate} />
          )}
        </div>

        {plan === "plus" ? <MethodologyFootnote /> : null}
      </Card>

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

function PlusGate() {
  return (
    <div className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-4">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 text-accent" />
        <div>
          <p className="text-sm font-medium text-ink">
            Ingredient correlations are a Plus feature.
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Upgrade to see which ingredients show up more often in products you
            reacted to than in ones you didn&apos;t.
          </p>
        </div>
      </div>
      <a href="/settings/account" className="inline-flex">
        <Button size="sm">
          <Sparkles className="h-4 w-4" />
          Upgrade to Plus
        </Button>
      </a>
    </div>
  );
}

function MethodologyFootnote() {
  return (
    <details className="group mt-4 rounded-xl border border-ink/10 bg-paper-raised">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        <span>How we computed this</span>
        <span className="ml-auto text-ink-muted group-open:hidden">Show</span>
        <span className="ml-auto hidden text-ink-muted group-open:inline">Hide</span>
      </summary>
      <div className="space-y-3 border-t border-ink/10 px-4 py-3 text-xs text-ink-soft">
        <p>
          We use{" "}
          <span className="font-medium text-ink">lift</span> &mdash; how much more
          often an ingredient appears in products you reacted to versus your
          baseline reaction rate. Only ingredients in {"≥2"} of your products
          and with lift {"> 1"} are shown. Read the full rules in{" "}
          <a
            href={METHODOLOGY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            docs/METHODOLOGY.md
          </a>
          .
        </p>
        <div>
          <p className="mb-1.5 font-medium text-ink">
            Structural ingredients we filter out:
          </p>
          <ul className="space-y-1">
            {STRUCTURAL_FILTER.map((entry) => (
              <li key={entry.token} className="flex flex-wrap gap-x-2">
                <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[11px] text-ink">
                  {entry.label}
                </code>
                <span className="text-ink-muted">{entry.reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-ink-muted">
            These appear in nearly every cosmetic, so flagging them would only
            produce noise. The verdict screen is unaffected by this filter.
          </p>
        </div>
      </div>
    </details>
  );
}

function NotEnoughData({
  reason,
}: {
  reason: "not_enough_products" | "not_enough_reacted_products" | "no_lift_signal";
}) {
  const copy = {
    not_enough_products:
      "We need at least 3 scanned products before we can spot patterns. Keep scanning.",
    not_enough_reacted_products:
      "Log at least 2 reactions linked to specific products and we'll start surfacing the ingredients they share.",
    no_lift_signal:
      "No ingredient is showing up disproportionately in your reacted products yet. Keep logging — the table will populate as patterns emerge.",
  }[reason];
  return (
    <p className="rounded-xl border border-ink/10 bg-paper-raised px-4 py-3 text-sm text-ink-soft">
      {copy}
    </p>
  );
}

function CorrelationsTable({
  rows,
  baseRate,
}: {
  rows: Array<{
    token: string;
    totalCount: number;
    reactedCount: number;
    reactionRate: number;
    lift: number;
  }>;
  baseRate: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10">
      <table className="w-full text-sm">
        <thead className="bg-paper-raised text-left text-xs uppercase tracking-wider text-ink-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Ingredient</th>
            <th className="px-4 py-2 text-right font-medium">In products</th>
            <th className="px-4 py-2 text-right font-medium">Reacted</th>
            <th className="px-4 py-2 text-right font-medium">Lift</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {rows.map((row) => (
            <tr key={row.token}>
              <td className="px-4 py-2 text-ink">{row.token}</td>
              <td className="px-4 py-2 text-right tabular text-ink-soft">
                {row.totalCount}
              </td>
              <td className="px-4 py-2 text-right tabular text-ink-soft">
                {row.reactedCount}
              </td>
              <td className="px-4 py-2 text-right tabular text-ink">
                {row.lift.toFixed(2)}×
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="bg-paper-raised px-4 py-2 text-xs text-ink-muted">
        Baseline reaction rate: {(baseRate * 100).toFixed(0)}% of all products.
        Lift &gt; 1 means an ingredient appears more often in reacted products
        than the baseline.
      </p>
    </div>
  );
}
