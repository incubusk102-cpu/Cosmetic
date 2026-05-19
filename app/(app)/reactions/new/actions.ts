"use server";

import { revalidatePath } from "next/cache";
import { importUserProductFromCache } from "@/lib/products/importFromCache";
import { sanitizeProductSearchQuery } from "@/lib/products/searchQuery";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";

export interface CacheSearchResult {
  barcode: string;
  brand: string | null;
  name: string | null;
}

/**
 * Search the shared `product_cache` table by brand or product name. Used by
 * the "attach any product" picker on `/reactions/new`: the reaction can then
 * point at a product the user has never personally scanned. The first time
 * a user picks a cached product, a per-user `products` row is imported on
 * demand so the foreign key on `reactions.product_id` stays satisfied.
 */
export async function searchProductCache(
  query: string,
): Promise<
  | { ok: true; results: CacheSearchResult[] }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const sanitized = sanitizeProductSearchQuery(query);
  if (!sanitized.ok) {
    return { ok: false, error: "Type at least two characters to search." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_cache")
    .select("barcode, brand, name")
    .or(`name.ilike.${sanitized.pattern},brand.ilike.${sanitized.pattern}`)
    .order("fetched_at", { ascending: false })
    .limit(10);
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    results: (data ?? []).map((row) => ({
      barcode: row.barcode,
      brand: row.brand,
      name: row.name,
    })),
  };
}

export async function createReaction(args: {
  /** A `products.id` owned by the signed-in user. */
  productId: string | null;
  /**
   * A `product_cache.barcode`. When set (and `productId` is null), we'll
   * import the cached product into the user's own `products` table first,
   * then attach the reaction to that imported row. Mutually exclusive with
   * `productId`.
   */
  productCacheBarcode?: string | null;
  severity: number;
  bodyArea: string | null;
  symptoms: string[];
  notes: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (args.severity < 0 || args.severity > 4) {
    return { ok: false, error: "Severity must be between 0 and 4." };
  }
  if (args.productId && args.productCacheBarcode) {
    return {
      ok: false,
      error: "Pick a product or a cached product, not both.",
    };
  }

  let productId = args.productId;
  if (!productId && args.productCacheBarcode) {
    const imported = await importUserProductFromCache({
      userId: user.id,
      cacheBarcode: args.productCacheBarcode,
    });
    if (!imported.ok) return { ok: false, error: imported.error };
    productId = imported.productId;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("reactions").insert({
    user_id: user.id,
    product_id: productId,
    severity: args.severity,
    body_area: args.bodyArea,
    symptoms: args.symptoms.length > 0 ? args.symptoms : null,
    notes: args.notes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/reactions");
  revalidatePath("/products");
  return { ok: true };
}
