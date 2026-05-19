import "server-only";

import { matchIngredients, type UserAllergenSelection } from "@/lib/matching/engine";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ImportFromCacheResult =
  | { ok: true; productId: string; importedFromCache: boolean }
  | { ok: false; error: string };

/**
 * Take a barcode that exists in the shared `product_cache` and make sure the
 * signed-in user has a corresponding row in their own `products` table. If
 * they already scanned that barcode we reuse the existing row; otherwise we
 * import a fresh copy from the cache (recomputing the verdict against the
 * user's allergen list — same engine as the scan flow).
 *
 * Returns `importedFromCache: true` when a new user-products row was inserted,
 * `false` when an existing row was reused. Either way `productId` is set.
 */
export async function importUserProductFromCache(args: {
  userId: string;
  cacheBarcode: string;
}): Promise<ImportFromCacheResult> {
  const supabase = getSupabaseServerClient();

  // 1. Existing per-user product on the same barcode?
  const existing = await supabase
    .from("products")
    .select("id")
    .eq("user_id", args.userId)
    .eq("barcode", args.cacheBarcode)
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) return { ok: false, error: existing.error.message };
  if (existing.data) {
    return { ok: true, productId: existing.data.id, importedFromCache: false };
  }

  // 2. Look the barcode up in the shared cache.
  const cached = await supabase
    .from("product_cache")
    .select("barcode, brand, name, ingredients_raw")
    .eq("barcode", args.cacheBarcode)
    .maybeSingle();
  if (cached.error) return { ok: false, error: cached.error.message };
  if (!cached.data) {
    return { ok: false, error: "That product isn't in our cache anymore." };
  }
  if (!cached.data.ingredients_raw) {
    return {
      ok: false,
      error: "That product is in our cache but has no ingredients on file.",
    };
  }

  // 3. Compute the verdict against the user's allergen list, then insert.
  const userAllergens = await loadUserAllergens(args.userId);
  const verdict = matchIngredients(
    cached.data.ingredients_raw,
    userAllergens,
  ).verdict;

  const inserted = await supabase
    .from("products")
    .insert({
      user_id: args.userId,
      source: "barcode",
      barcode: cached.data.barcode,
      brand: cached.data.brand,
      name: cached.data.name,
      ingredients_raw: cached.data.ingredients_raw,
      last_verdict: verdict,
      is_saved: false,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    return {
      ok: false,
      error: inserted.error?.message ?? "Failed to import the cached product.",
    };
  }
  return {
    ok: true,
    productId: inserted.data.id,
    importedFromCache: true,
  };
}

async function loadUserAllergens(userId: string): Promise<UserAllergenSelection[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("user_allergens")
    .select("allergen_key, custom_label")
    .eq("user_id", userId);
  return (data ?? []).map((r) => ({
    allergen_key: r.allergen_key,
    custom_label: r.custom_label,
  }));
}
