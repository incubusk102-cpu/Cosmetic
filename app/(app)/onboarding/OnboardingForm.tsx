"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { saveAllergenSelection } from "./actions";
import { ONBOARDING_PICK_CAP } from "./constants";
import type { AllergenCategory } from "@/lib/allergens/types";

const METHODOLOGY_URL =
  "https://github.com/incubusk102-cpu/Cosmetic/blob/devin/1779212353-mvp-scaffold/docs/METHODOLOGY.md";

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

  const customLabels = useMemo(
    () =>
      Array.from(
        new Set(
          custom
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        ),
      ),
    [custom],
  );

  const totalCount = selected.size + customLabels.length;
  const atCap = totalCount >= ONBOARDING_PICK_CAP;
  const overCap = totalCount > ONBOARDING_PICK_CAP;

  function toggle(key: string) {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      // Enforce cap on add. Removing an existing pick is always allowed.
      if (prev.size + customLabels.length >= ONBOARDING_PICK_CAP) {
        setError(
          `Pick at most ${ONBOARDING_PICK_CAP} to start — you can add more later in Settings.`,
        );
        return prev;
      }
      next.add(key);
      return next;
    });
  }

  function onSubmit() {
    setError(null);
    if (totalCount === 0) {
      setError("Pick at least one allergen or add a custom one.");
      return;
    }
    if (overCap) {
      setError(
        `Pick at most ${ONBOARDING_PICK_CAP} to start — you can add more later in Settings.`,
      );
      return;
    }
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
      <HowMatchingWorks />

      {groups.map((g) => (
        <section key={g.category} className="space-y-2">
          <h2 className="text-sm font-medium text-ink">{g.label}</h2>
          <div className="flex flex-wrap gap-2">
            {g.items.map((item) => {
              const isSelected = selected.has(item.key);
              const disabled = !isSelected && atCap;
              return (
                <Chip
                  key={item.key}
                  label={item.canonical}
                  selected={isSelected}
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={() => toggle(item.key)}
                  className={disabled ? "opacity-40" : undefined}
                />
              );
            })}
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
          onChange={(e) => {
            setError(null);
            setCustom(e.target.value);
          }}
          placeholder="e.g. Niacinamide, Cetyl Alcohol"
          className="block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      </section>

      <div className="flex items-center justify-between border-t border-ink/10 pt-5">
        <p
          className={`text-xs tabular ${overCap ? "text-verdict-avoid" : "text-ink-muted"}`}
          aria-live="polite"
        >
          {totalCount} / {ONBOARDING_PICK_CAP} selected
        </p>
        <Button onClick={onSubmit} disabled={isPending || overCap} size="lg">
          {isPending ? "Saving…" : "Continue"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-verdict-avoid" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function HowMatchingWorks() {
  return (
    <details className="group rounded-xl border border-ink/10 bg-paper-raised">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-ink transition-colors hover:text-ink/80">
        <Info className="h-4 w-4 text-ink-soft" aria-hidden="true" />
        <span>How matching works in 30 seconds</span>
        <span className="ml-auto text-xs text-ink-muted group-open:hidden">
          Show
        </span>
        <span className="ml-auto hidden text-xs text-ink-muted group-open:inline">
          Hide
        </span>
      </summary>
      <div className="space-y-3 border-t border-ink/10 px-4 py-4 text-sm text-ink-soft">
        <ol className="ml-4 list-decimal space-y-2">
          <li>
            We compare the product&apos;s ingredient list against{" "}
            <span className="font-medium text-ink">your</span> tracked allergens
            (and their known synonyms).
          </li>
          <li>
            <span className="font-medium text-ink">Avoid</span> &mdash; one of
            your tracked ingredients is in the product.
          </li>
          <li>
            <span className="font-medium text-ink">Caution</span> &mdash; a
            close relative (same family, e.g. another fragrance allergen) is in
            the product.
          </li>
          <li>
            <span className="font-medium text-ink">Clear</span> &mdash; no
            matches in your list. We never call a product &quot;safe&quot; &mdash;
            other reactions are still possible.
          </li>
        </ol>
        <p className="rounded-lg bg-ink/5 px-3 py-2 text-xs text-ink-soft">
          <span className="font-medium text-ink">Tip:</span> start with{" "}
          {ONBOARDING_PICK_CAP} or fewer. Tracking too many at once produces
          Caution on almost every product. You can always add more from
          Settings.
        </p>
        <p className="text-xs text-ink-muted">
          Full rules in{" "}
          <a
            href={METHODOLOGY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            docs/METHODOLOGY.md
          </a>
          . Informational only &mdash; not medical advice.
        </p>
      </div>
    </details>
  );
}
