import { redirect } from "next/navigation";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { ScanWorkspace } from "./ScanWorkspace";

export const metadata = { title: "Scan" };

export default async function ScanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Bounce first-time users into onboarding if they haven't picked allergens yet.
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from("user_allergens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) === 0) redirect("/onboarding");

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Scan</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">
          Point. Read. Decide.
        </h1>
        <p className="text-sm text-ink-muted">
          Scan a barcode, photograph the ingredients, or paste the list — your call.
        </p>
      </header>
      <ScanWorkspace />
    </div>
  );
}
