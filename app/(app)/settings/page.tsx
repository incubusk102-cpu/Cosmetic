import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

const ITEMS = [
  {
    href: "/settings/allergens",
    label: "Allergen list",
    description: "Add or remove what we check against.",
    icon: Sparkles,
  },
  {
    href: "/settings/account",
    label: "Account",
    description: "Sign out, export your data, delete your account.",
    icon: UserRound,
  },
] as const;

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Settings</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-ink-muted">{user.email}</p>
      </header>

      <ul className="space-y-2">
        {ITEMS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper-raised p-4 shadow-soft transition-colors hover:border-ink/25"
            >
              <Icon className="h-5 w-5 text-ink-soft" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{label}</p>
                <p className="text-xs text-ink-muted">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <div className="text-xs text-ink-soft">
            Your data is your own. We never sell it. Account export and delete are always
            available, always free, one click.
          </div>
        </div>
      </Card>
    </div>
  );
}
