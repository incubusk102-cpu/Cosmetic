"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
