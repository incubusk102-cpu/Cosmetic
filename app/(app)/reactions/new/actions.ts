"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";

export async function createReaction(args: {
  productId: string | null;
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

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("reactions").insert({
    user_id: user.id,
    product_id: args.productId,
    severity: args.severity,
    body_area: args.bodyArea,
    symptoms: args.symptoms.length > 0 ? args.symptoms : null,
    notes: args.notes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/reactions");
  return { ok: true };
}
