import Link from "next/link";
import { redirect } from "next/navigation";
import { ScanLine, Boxes, Activity, BarChart3, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";

const TABS = [
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/reactions", label: "Reactions", icon: Activity },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 md:pb-8 md:pl-64 md:pt-10">
        {children}
      </main>

      {/* Sidebar — desktop */}
      <nav
        aria-label="Primary"
        className="fixed left-0 top-0 hidden h-screen w-56 flex-col border-r border-ink/10 bg-paper-raised px-4 py-8 md:flex"
      >
        <p className="px-2 font-serif text-lg tracking-tight text-ink">
          Cosmetic Allergy
        </p>
        <p className="px-2 text-xs text-ink-muted">Tracker</p>
        <ul className="mt-8 space-y-1">
          {TABS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom tab bar — mobile */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-paper-raised/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] text-ink-soft hover:text-ink"
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
