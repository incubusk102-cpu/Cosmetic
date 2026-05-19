import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/supabase/server";
import { AccountActions } from "./AccountActions";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Account</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">Account</h1>
        <p className="text-sm text-ink-muted">{user.email}</p>
      </header>

      <Card>
        <CardTitle>Data export</CardTitle>
        <CardDescription>
          Download a JSON archive of your allergens, products, and reactions. Coming soon — for now
          contact support and we&apos;ll generate it manually.
        </CardDescription>
      </Card>

      <AccountActions />
    </div>
  );
}
