"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  createReaction,
  searchProductCache,
  type CacheSearchResult,
} from "./actions";

const BODY_AREAS = ["face", "eyes", "lips", "scalp", "neck", "body", "hands"] as const;
const SYMPTOMS = [
  "itch",
  "redness",
  "bumps",
  "dryness",
  "burning",
  "swelling",
  "flaking",
  "breakout",
] as const;

export interface InitialProductSelection {
  id: string;
  brand: string | null;
  name: string | null;
}

type Selection =
  | { kind: "user"; id: string; label: string }
  | { kind: "cache"; barcode: string; label: string };

function labelFor(brand: string | null, name: string | null, fallback: string) {
  return [brand, name].filter(Boolean).join(" — ") || fallback;
}

export function NewReactionForm({
  initialProduct,
}: {
  initialProduct: InitialProductSelection | null;
}) {
  const initialSelection: Selection | null = initialProduct
    ? {
        kind: "user",
        id: initialProduct.id,
        label: labelFor(initialProduct.brand, initialProduct.name, "This product"),
      }
    : null;

  const [selection, setSelection] = useState<Selection | null>(initialSelection);
  const [severity, setSeverity] = useState<number>(2);
  const [bodyArea, setBodyArea] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleSymptom(s: string) {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createReaction({
        productId: selection?.kind === "user" ? selection.id : null,
        productCacheBarcode:
          selection?.kind === "cache" ? selection.barcode : null,
        severity,
        bodyArea,
        symptoms: Array.from(symptoms),
        notes: notes.trim() || null,
      });
      if (res.ok) {
        router.push("/reactions");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <ProductField
        selection={selection}
        onSelect={setSelection}
        onClear={() => setSelection(null)}
      />

      <div>
        <label className="text-sm font-medium text-ink">Severity</label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <span className="w-24 text-right text-sm tabular text-ink-soft">
            {["None", "Mild", "Moderate", "Significant", "Severe"][severity]}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Body area</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BODY_AREAS.map((a) => (
            <Chip
              key={a}
              label={a}
              selected={bodyArea === a}
              onClick={() => setBodyArea(bodyArea === a ? null : a)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Symptoms</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={symptoms.has(s)}
              onClick={() => toggleSymptom(s)}
            />
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-ink">Notes (optional)</span>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          placeholder="What happened?"
        />
      </label>

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? "Saving…" : "Save reaction"}
      </Button>
      {error ? <p className="text-sm text-verdict-avoid">{error}</p> : null}
    </form>
  );
}

function ProductField({
  selection,
  onSelect,
  onClear,
}: {
  selection: Selection | null;
  onSelect: (next: Selection) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CacheSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  function runSearch() {
    setSearchError(null);
    startSearch(async () => {
      const res = await searchProductCache(query);
      if (res.ok) {
        setResults(res.results);
      } else {
        setSearchError(res.error);
        setResults(null);
      }
    });
  }

  function onPick(result: CacheSearchResult) {
    onSelect({
      kind: "cache",
      barcode: result.barcode,
      label: labelFor(result.brand, result.name, `Barcode ${result.barcode}`),
    });
    setQuery("");
    setResults(null);
    setSearchError(null);
  }

  if (selection) {
    return (
      <div>
        <p className="text-sm font-medium text-ink">Product</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5">
          <p className="min-w-0 truncate text-sm text-ink">{selection.label}</p>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-ink-muted hover:bg-ink/5"
          >
            <X className="h-3.5 w-3.5" /> Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">Product (optional)</p>
      <p className="mt-1 text-xs text-ink-muted">
        Search any product we&apos;ve cached, or leave blank for a general
        reaction.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="Brand or product name…"
          className="flex-1 rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={runSearch}
          disabled={isSearching || query.trim().length < 2}
        >
          <Search className="h-4 w-4" />
          {isSearching ? "Searching…" : "Search"}
        </Button>
      </div>

      {searchError ? (
        <p className="mt-2 text-xs text-verdict-avoid">{searchError}</p>
      ) : null}

      {results !== null && !searchError ? (
        results.length === 0 ? (
          <p className="mt-3 rounded-xl border border-ink/10 bg-paper-raised px-3 py-2 text-xs text-ink-muted">
            No cached products match &ldquo;{query}&rdquo;. Scan it yourself
            from the Scan tab — it&apos;ll show up here for the next reaction.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {results.map((r) => (
              <li key={r.barcode}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2 text-left transition-colors hover:border-accent/40 hover:bg-accent/5"
                >
                  <p className="truncate text-sm font-medium text-ink">
                    {r.name ?? `Barcode ${r.barcode}`}
                  </p>
                  {r.brand ? (
                    <p className="truncate text-xs text-ink-muted">{r.brand}</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
