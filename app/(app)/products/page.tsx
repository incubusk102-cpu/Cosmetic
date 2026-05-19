import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Verdict } from "@/lib/supabase/database.types";

export const metadata = { title: "My Products" };

const VERDICT_TONE: Record<Verdict, "safe" | "caution" | "avoid"> = {
  safe: "safe",
  caution: "caution",
  avoid: "avoid",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  safe: "Clear",
  caution: "Caution",
  avoid: "Avoid",
};

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id, brand, name, last_verdict, scanned_at, is_saved")
    .eq("user_id", user.id)
    .order("scanned_at", { ascending: false })
    .limit(100);

  const items = data ?? [];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Products</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">My Products</h1>
        <p className="text-sm text-ink-muted">Everything you&apos;ve scanned, newest first.</p>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardTitle>No scans yet</CardTitle>
          <CardDescription>Scan your first product from the Scan tab.</CardDescription>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/scan/result/${p.id}`}
                className="block rounded-2xl border border-ink/10 bg-paper-raised p-4 shadow-soft transition-colors hover:border-ink/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {p.name ?? "Unnamed product"}
                    </p>
                    {p.brand ? (
                      <p className="truncate text-xs text-ink-muted">{p.brand}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] tabular text-ink-muted">
                      {new Date(p.scanned_at).toLocaleDateString()}
                    </p>
                  </div>
                  {p.last_verdict ? (
                    <Badge tone={VERDICT_TONE[p.last_verdict]}>
                      {VERDICT_LABEL[p.last_verdict]}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
