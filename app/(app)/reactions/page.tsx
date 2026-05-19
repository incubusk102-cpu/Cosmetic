import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Reactions" };

const SEVERITY_LABEL = ["None", "Mild", "Moderate", "Significant", "Severe"] as const;

export default async function ReactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("reactions")
    .select(
      "id, severity, body_area, symptoms, notes, occurred_at, product_id, products(name, brand)",
    )
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    severity: number;
    body_area: string | null;
    symptoms: string[] | null;
    notes: string | null;
    occurred_at: string;
    product_id: string | null;
    // Supabase types the foreign-key embed as an array; in practice it's a
    // single row when the relationship is many-to-one. Normalize below.
    products:
      | { name: string | null; brand: string | null }
      | { name: string | null; brand: string | null }[]
      | null;
  };

  const items: Array<Omit<Row, "products"> & {
    products: { name: string | null; brand: string | null } | null;
  }> = (data ?? []).map((r) => {
    const row = r as Row;
    const product = Array.isArray(row.products) ? row.products[0] ?? null : row.products;
    return { ...row, products: product };
  });

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Reactions</p>
          <h1 className="font-serif text-3xl tracking-tight text-ink">Reaction log</h1>
          <p className="text-sm text-ink-muted">
            What happened, when, and on which product.
          </p>
        </div>
        <Link href="/reactions/new">
          <Button>Log a reaction</Button>
        </Link>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardTitle>No reactions logged yet</CardTitle>
          <CardDescription>
            Logging reactions is what makes the matching smarter for you over time.
          </CardDescription>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-ink/10 bg-paper-raised p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {r.products?.name ?? "General reaction"}
                  </p>
                  {r.products?.brand ? (
                    <p className="text-xs text-ink-muted">{r.products.brand}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] tabular text-ink-muted">
                    {new Date(r.occurred_at).toLocaleString()}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-ink-soft">
                  {SEVERITY_LABEL[r.severity] ?? `Severity ${r.severity}`}
                </span>
              </div>
              {r.body_area || r.symptoms?.length ? (
                <p className="mt-2 text-xs text-ink-muted">
                  {[r.body_area, r.symptoms?.join(", ")].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {r.notes ? <p className="mt-2 text-sm text-ink-soft">{r.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
