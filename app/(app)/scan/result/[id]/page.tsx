import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VerdictWord } from "@/components/ui/VerdictWord";
import { matchIngredients } from "@/lib/matching/engine";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Verdict } from "@/lib/supabase/database.types";
import { SaveToggle } from "./SaveToggle";

interface PageProps {
  params: { id: string };
}

const HEADLINE: Record<Verdict, string> = {
  safe: "No matches in your list.",
  caution: "Close relatives of your allergens were found.",
  avoid: "Contains items on your allergen list.",
};

export default async function ScanResultPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  const { data: userAllergens } = await supabase
    .from("user_allergens")
    .select("allergen_key, custom_label")
    .eq("user_id", user.id);

  const result = matchIngredients(product.ingredients_raw ?? "", userAllergens ?? []);
  const verdict: Verdict = result.verdict;
  const headline = HEADLINE[verdict];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <VerdictWord verdict={verdict} />
        <p className="text-sm text-ink-soft">{headline}</p>
      </section>

      <Card>
        <CardTitle>{product.name ?? "Unknown product"}</CardTitle>
        {product.brand ? (
          <CardDescription>{product.brand}</CardDescription>
        ) : null}
        {product.barcode ? (
          <p className="mt-2 text-xs tabular text-ink-muted">
            Barcode {product.barcode}
          </p>
        ) : null}

        {result.directMatches.length > 0 ? (
          <section className="mt-5 space-y-2">
            <p className="text-sm font-medium text-ink">On your allergen list:</p>
            <ul className="space-y-1.5">
              {result.directMatches.map((m, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-verdict-avoid/20 bg-verdict-avoid/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{m.label}</p>
                    {m.entry?.explanation ? (
                      <p className="text-xs text-ink-muted">{m.entry.explanation}</p>
                    ) : null}
                  </div>
                  <Badge tone="avoid">match</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {result.directMatches.length === 0 && result.relativeMatches.length > 0 ? (
          <section className="mt-5 space-y-2">
            <p className="text-sm font-medium text-ink">Same family as your list:</p>
            <ul className="space-y-1.5">
              {result.relativeMatches.map((m, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-verdict-caution/20 bg-verdict-caution/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{m.label}</p>
                    {m.entry?.explanation ? (
                      <p className="text-xs text-ink-muted">{m.entry.explanation}</p>
                    ) : null}
                  </div>
                  <Badge tone="caution">relative</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {result.tokens.length > 0 ? (
          <details className="mt-5">
            <summary className="cursor-pointer text-xs text-ink-muted">
              Show parsed ingredients ({result.tokens.length})
            </summary>
            <p className="mt-2 text-xs text-ink-soft">
              {result.tokens.join(", ")}
            </p>
          </details>
        ) : null}
      </Card>

      <Card className="border-accent/20 bg-accent/5">
        <CardTitle>Did this product trigger a reaction?</CardTitle>
        <CardDescription>
          Logging it now means the correlations on <Link href="/insights" className="underline">/insights</Link>{" "}
          get smarter over time.
        </CardDescription>
        <div className="mt-3">
          <Link href={`/reactions/new?product=${product.id}`}>
            <Button>Log a reaction for this product</Button>
          </Link>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SaveToggle productId={product.id} initialSaved={product.is_saved} />
        <Link href="/scan">
          <Button variant="ghost">Scan another</Button>
        </Link>
      </div>

      <p className="px-1 text-xs text-ink-muted">
        Informational only. Not medical advice or a diagnosis. Consult a licensed dermatologist for
        medical concerns.
      </p>
    </div>
  );
}
