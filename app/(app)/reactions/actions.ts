"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Attach an existing reaction (one the signed-in user owns) to one of their
 * own products. RLS already prevents cross-user updates, but we also verify
 * the product belongs to the same user as a defense-in-depth check so the
 * UI doesn't silently no-op.
 */
export async function attachReactionToProduct(args: {
  reactionId: string;
  productId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!args.reactionId || !args.productId) {
    return { ok: false, error: "Missing reaction or product." };
  }

  const supabase = getSupabaseServerClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", args.productId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (productError) return { ok: false, error: productError.message };
  if (!product) {
    return { ok: false, error: "Product not found." };
  }

  const { error } = await supabase
    .from("reactions")
    .update({ product_id: args.productId })
    .eq("id", args.reactionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/reactions");
  revalidatePath("/insights");
  return { ok: true };
}
