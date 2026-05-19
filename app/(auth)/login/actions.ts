"use server";

import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function sendMagicLink(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "That doesn't look like a valid email address." };
  }

  const supabase = getSupabaseServerClient();
  const origin = headers().get("origin") ?? "";

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: origin
        ? `${origin}/auth/callback`
        : undefined,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
