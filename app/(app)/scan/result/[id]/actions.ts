"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";

export async function toggleSaveProduct(
  productId: string,
  saved: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ is_saved: saved })
    .eq("id", productId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/products");
  revalidatePath(`/scan/result/${productId}`);
  return { ok: true };
}
