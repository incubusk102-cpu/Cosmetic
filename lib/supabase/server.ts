import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Server-side Supabase client.
 *
 * Use inside Server Components, Server Actions, and Route Handlers.
 * Reads the session from the request cookies; writes are best-effort
 * (RSC contexts are read-only for cookies and will silently no-op).
 */
export function getSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // RSC contexts cannot mutate cookies; this is expected.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Same as above.
        }
      },
    },
  });
}

/**
 * Returns the authenticated user or null. Use as a small guard inside
 * server components and actions:
 *
 *   const user = await requireUser();
 */
export async function getCurrentUser() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
