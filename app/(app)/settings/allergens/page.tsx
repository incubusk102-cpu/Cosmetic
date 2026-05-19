import { redirect } from "next/navigation";
import { ALLERGENS } from "@/lib/allergens/data";
import type { AllergenCategory } from "@/lib/allergens/types";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { AllergenManager } from "./AllergenManager";

const CATEGORY_LABELS: Record<AllergenCategory, string> = {
  fragrance: "Fragrance",
  preservative: "Preservatives",
  sulfate: "Sulfates",
  retinoid: "Retinoids",
  acid: "Acids",
  essential_oil: "Essential oils",
  silicone: "Silicones",
  sun_filter: "Sun filters",
  alcohol: "Alcohol",
  other: "Other",
};

export const metadata = { title: "Allergens" };

export default async function AllergensSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("user_allergens")
    .select("id, allergen_key, custom_label")
    .eq("user_id", user.id);

  const selectedKeys = new Set<string>(
    (data ?? [])
      .filter((d): d is typeof d & { allergen_key: string } => Boolean(d.allergen_key))
      .map((d) => d.allergen_key),
  );
  const customs = (data ?? [])
    .filter((d): d is typeof d & { custom_label: string } => Boolean(d.custom_label))
    .map((d) => ({ id: d.id, label: d.custom_label }));

  const grouped = ALLERGENS.reduce<Record<string, typeof ALLERGENS[number][]>>((acc, a) => {
    (acc[a.category] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Settings</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">Allergen list</h1>
        <p className="text-sm text-ink-muted">Changes take effect on your next scan.</p>
      </header>
      <AllergenManager
        groups={Object.entries(grouped).map(([category, items]) => ({
          category: category as AllergenCategory,
          label: CATEGORY_LABELS[category as AllergenCategory] ?? category,
          items: items.map((i) => ({ key: i.key, canonical: i.canonical })),
        }))}
        initialKeys={Array.from(selectedKeys)}
        initialCustoms={customs}
      />
    </div>
  );
}
