"use server";

import { revalidatePath } from "next/cache";
import { ALLERGENS_BY_KEY } from "@/lib/allergens/data";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";

export async function setAllergenKeys(
  keys: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = getSupabaseServerClient();
  const valid = keys.filter((k) => ALLERGENS_BY_KEY.has(k));

  // Strategy: delete the user's existing dictionary-keyed rows, then re-insert.
  // (Custom entries are untouched here.)
  const del = await supabase
    .from("user_allergens")
    .delete()
    .eq("user_id", user.id)
    .not("allergen_key", "is", null);
  if (del.error) return { ok: false, error: del.error.message };

  if (valid.length > 0) {
    const ins = await supabase
      .from("user_allergens")
      .insert(valid.map((k) => ({ user_id: user.id, allergen_key: k })));
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/settings/allergens");
  revalidatePath("/scan");
  return { ok: true };
}

export async function addCustomAllergen(
  label: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Enter a label." };

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_allergens")
    .insert({ user_id: user.id, custom_label: trimmed })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Failed to save." };

  revalidatePath("/settings/allergens");
  return { ok: true, id: data.id };
}

export async function removeAllergen(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("user_allergens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/allergens");
  return { ok: true };
}
