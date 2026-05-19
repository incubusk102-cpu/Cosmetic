"use server";

import { revalidatePath } from "next/cache";
import { fetchProductByBarcode } from "@/lib/obf/client";
import { matchIngredients, type UserAllergenSelection } from "@/lib/matching/engine";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ActionResult =
  | { ok: true; productId: string }
  | { ok: false; error: string };

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

export async function runBarcodeScan(barcode: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = getSupabaseServerClient();

  // 1. Check shared cache.
  let brand: string | null = null;
  let name: string | null = null;
  let ingredients_raw: string | null = null;

  const cached = await supabase
    .from("product_cache")
    .select("brand, name, ingredients_raw")
    .eq("barcode", barcode)
    .maybeSingle();

  if (cached.data && cached.data.ingredients_raw) {
    brand = cached.data.brand;
    name = cached.data.name;
    ingredients_raw = cached.data.ingredients_raw;
  } else {
    // 2. Cache miss → hit OBF, then write to cache via service role.
    const fetched = await fetchProductByBarcode(barcode);
    if (!fetched || !fetched.ingredients_raw) {
      return {
        ok: false,
        error:
          "We couldn't find this product. Try the Manual tab and paste the ingredients list.",
      };
    }
    brand = fetched.brand;
    name = fetched.name;
    ingredients_raw = fetched.ingredients_raw;

    try {
      const admin = getSupabaseAdminClient();
      await admin.from("product_cache").upsert({
        barcode,
        brand,
        name,
        ingredients_raw,
        source: "openbeautyfacts",
      });
    } catch {
      // Cache write is best-effort; not fatal.
    }
  }

  if (!ingredients_raw) {
    return {
      ok: false,
      error: "We found this product but it has no ingredient list yet.",
    };
  }

  return finalizeScan({
    userId: user.id,
    source: "barcode",
    barcode,
    brand,
    name,
    ingredients_raw,
  });
}

export async function runManualScan(args: {
  ingredients: string;
  productName?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const ingredients = args.ingredients.trim();
  if (!ingredients) {
    return { ok: false, error: "Paste the ingredients list to continue." };
  }
  return finalizeScan({
    userId: user.id,
    source: "manual",
    barcode: null,
    brand: null,
    name: args.productName ?? null,
    ingredients_raw: ingredients,
  });
}

async function finalizeScan(args: {
  userId: string;
  source: "barcode" | "manual" | "ocr";
  barcode: string | null;
  brand: string | null;
  name: string | null;
  ingredients_raw: string;
}): Promise<ActionResult> {
  const supabase = getSupabaseServerClient();
  const userAllergens = await loadUserAllergens(args.userId);
  const result = matchIngredients(args.ingredients_raw, userAllergens);

  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: args.userId,
      source: args.source,
      barcode: args.barcode,
      brand: args.brand,
      name: args.name,
      ingredients_raw: args.ingredients_raw,
      last_verdict: result.verdict,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save the scan." };
  }

  revalidatePath("/products");
  return { ok: true, productId: data.id };
}
