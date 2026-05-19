"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { saveAllergenSelection } from "./actions";
import type { AllergenCategory } from "@/lib/allergens/types";

interface Group {
  category: AllergenCategory;
  label: string;
  items: { key: string; canonical: string }[];
}

export function OnboardingForm({ groups }: { groups: Group[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function onSubmit() {
    setError(null);
    const customLabels = custom
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    startTransition(async () => {
      const res = await saveAllergenSelection(Array.from(selected), customLabels);
      if (res.ok) {
        router.replace("/scan");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <section key={g.category} className="space-y-2">
          <h2 className="text-sm font-medium text-ink">{g.label}</h2>
          <div className="flex flex-wrap gap-2">
            {g.items.map((item) => (
              <Chip
                key={item.key}
                label={item.canonical}
                selected={selected.has(item.key)}
                onClick={() => toggle(item.key)}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <label className="text-sm font-medium text-ink">
          Anything custom?
          <span className="ml-2 font-normal text-ink-muted">
            Comma-separated, optional
          </span>
        </label>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. Niacinamide, Cetyl Alcohol"
          className="block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      </section>

      <div className="flex items-center justify-between border-t border-ink/10 pt-5">
        <p className="text-xs text-ink-muted tabular">
          {selected.size + custom.split(",").filter((s) => s.trim()).length} selected
        </p>
        <Button onClick={onSubmit} disabled={isPending} size="lg">
          {isPending ? "Saving…" : "Continue"}
        </Button>
      </div>
      {error ? <p className="text-sm text-verdict-avoid">{error}</p> : null}
    </div>
  );
}
