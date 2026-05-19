import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { NewReactionForm, type InitialProductSelection } from "./NewReactionForm";

export const metadata = { title: "Log a reaction" };

interface PageProps {
  searchParams: { product?: string };
}

export default async function NewReactionPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  let product: InitialProductSelection | null = null;
  if (searchParams.product) {
    const { data } = await supabase
      .from("products")
      .select("id, name, brand")
      .eq("id", searchParams.product)
      .eq("user_id", user.id)
      .maybeSingle();
    product = data ?? null;
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Reaction</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">Log a reaction</h1>
        {product ? (
          <p className="text-sm text-ink-muted">
            On {product.name ?? "this product"}
            {product.brand ? ` (${product.brand})` : ""}.
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            Pick any product from the search below, or leave it blank for a
            general reaction.
          </p>
        )}
      </header>
      <Card>
        <NewReactionForm initialProduct={product} />
      </Card>
    </div>
  );
}
