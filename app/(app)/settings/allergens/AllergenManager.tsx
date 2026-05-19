"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { AllergenCategory } from "@/lib/allergens/types";
import { addCustomAllergen, removeAllergen, setAllergenKeys } from "./actions";

interface Group {
  category: AllergenCategory;
  label: string;
  items: { key: string; canonical: string }[];
}

interface Props {
  groups: Group[];
  initialKeys: string[];
  initialCustoms: { id: string; label: string }[];
}

export function AllergenManager({ groups, initialKeys, initialCustoms }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialKeys));
  const [customs, setCustoms] = useState(initialCustoms);
  const [newCustom, setNewCustom] = useState("");
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

  function saveKeys() {
    setError(null);
    startTransition(async () => {
      const res = await setAllergenKeys(Array.from(selected));
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function addCustom() {
    const label = newCustom.trim();
    if (!label) return;
    setError(null);
    setNewCustom("");
    startTransition(async () => {
      const res = await addCustomAllergen(label);
      if (res.ok) {
        setCustoms((prev) => [...prev, { id: res.id, label }]);
      } else {
        setError(res.error);
      }
    });
  }

  function removeCustom(id: string) {
    setError(null);
    setCustoms((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      const res = await removeAllergen(id);
      if (!res.ok) setError(res.error);
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

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink">Custom</h2>
        <ul className="flex flex-wrap gap-2">
          {customs.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => removeCustom(c.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper-raised px-3 py-1.5 text-sm text-ink hover:border-ink/25"
              >
                <X className="h-3.5 w-3.5" />
                {c.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={newCustom}
            onChange={(e) => setNewCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add custom (e.g. Niacinamide)"
            className="flex-1 rounded-xl border border-ink/10 bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <Button onClick={addCustom} variant="secondary" disabled={isPending}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-ink/10 pt-5">
        <p className="text-xs text-ink-muted tabular">
          {selected.size + customs.length} tracked
        </p>
        <Button onClick={saveKeys} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
      {error ? <p className="text-sm text-verdict-avoid">{error}</p> : null}
    </div>
  );
}
