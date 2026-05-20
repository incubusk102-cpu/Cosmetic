"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { ALLERGENS_BY_KEY } from "@/lib/allergens/data";
import { ONBOARDING_PICK_CAP } from "./constants";

export async function saveAllergenSelection(
  keys: string[],
  customLabels: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = getSupabaseServerClient();

  const validKeys = keys.filter((k) => ALLERGENS_BY_KEY.has(k));
  const dedupedCustom = Array.from(
    new Set(customLabels.map((s) => s.trim()).filter((s) => s.length > 0)),
  );

  const total = validKeys.length + dedupedCustom.length;
  if (total === 0) {
    return { ok: false, error: "Pick at least one allergen or add a custom one." };
  }
  if (total > ONBOARDING_PICK_CAP) {
    return {
      ok: false,
      error: `Pick at most ${ONBOARDING_PICK_CAP} to start — you can add more later in Settings.`,
    };
  }

  const rows = [
    ...validKeys.map((k) => ({ user_id: user.id, allergen_key: k })),
    ...dedupedCustom.map((label) => ({ user_id: user.id, custom_label: label })),
  ];

  const { error } = await supabase.from("user_allergens").upsert(rows, {
    onConflict: "user_id,allergen_key,custom_label",
    ignoreDuplicates: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/scan");
  revalidatePath("/settings/allergens");
  return { ok: true };
}
