import { redirect } from "next/navigation";
import { ALLERGENS } from "@/lib/allergens/data";
import type { AllergenCategory } from "@/lib/allergens/types";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

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

export const metadata = { title: "Set up your allergens" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data: existing } = await supabase
    .from("user_allergens")
    .select("allergen_key, custom_label")
    .eq("user_id", user.id);

  if (existing && existing.length > 0) {
    redirect("/scan");
  }

  const grouped = ALLERGENS.reduce<Record<string, typeof ALLERGENS[number][]>>((acc, a) => {
    (acc[a.category] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Onboarding</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">
          What should we help you avoid?
        </h1>
        <p className="text-sm text-ink-muted">
          Pick anything you&apos;ve reacted to or want to track. You can change this any time.
        </p>
      </header>

      <OnboardingForm
        groups={Object.entries(grouped).map(([category, items]) => ({
          category: category as AllergenCategory,
          label: CATEGORY_LABELS[category as AllergenCategory] ?? category,
          items: items.map((i) => ({ key: i.key, canonical: i.canonical })),
        }))}
      />
    </div>
  );
}
