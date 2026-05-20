"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  searchProductCache,
  type CacheSearchResult,
} from "./new/actions";
import {
  attachReactionToCachedProduct,
  attachReactionToProduct,
} from "./actions";

export interface ProductOption {
  id: string;
  label: string;
}

/**
 * Inline affordance shown next to a reaction with `product_id IS NULL`.
 * Lets the user pick one of their own products (the common case) or
 * fall back to searching the shared `product_cache` (for reactions to
 * products they never personally scanned — a friend's product, something
 * they used in store, etc.). v3 P1.
 *
 * The cache search is collapsed by default so the common case (pick from
 * your own products) stays one click. When the user has zero products of
 * their own we skip straight to the cache search.
 */
export function AttachProductRow({
  reactionId,
  products,
}: {
  reactionId: string;
  products: ReadonlyArray<ProductOption>;
}) {
  const hasOwnProducts = products.length > 0;
  const [productId, setProductId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Auto-expand the cache search when the user has nothing of their own
  // to pick. Otherwise leave it collapsed so the common case is one tap.
  const [cacheOpen, setCacheOpen] = useState<boolean>(!hasOwnProducts);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productId) {
      setError("Pick a product first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await attachReactionToProduct({ reactionId, productId });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function attachFromCache(result: CacheSearchResult) {
    setError(null);
    startTransition(async () => {
      const res = await attachReactionToCachedProduct({
        reactionId,
        cacheBarcode: result.barcode,
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {hasOwnProducts ? (
        <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`attach-${reactionId}`}>
            Attach to product
          </label>
          <select
            id={`attach-${reactionId}`}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="min-w-[12rem] flex-1 rounded-xl border border-ink/10 bg-paper-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            disabled={isPending}
          >
            <option value="">Attach to product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            variant="secondary"
            disabled={isPending || !productId}
          >
            {isPending ? "Attaching…" : "Attach"}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-ink-muted">
          You haven&apos;t scanned anything yet — search any cached product
          below, or scan one from the Scan tab.
        </p>
      )}

      {hasOwnProducts ? (
        <button
          type="button"
          onClick={() => setCacheOpen((open) => !open)}
          className="text-xs text-ink-muted underline decoration-ink/20 underline-offset-2 hover:text-ink hover:decoration-accent"
        >
          {cacheOpen
            ? "Hide cached-product search"
            : "Don't see it? Search any cached product"}
        </button>
      ) : null}

      {cacheOpen ? (
        <CacheSearch
          disabled={isPending}
          onPick={attachFromCache}
        />
      ) : null}

      {error ? (
        <p className="text-xs text-verdict-avoid">{error}</p>
      ) : null}
    </div>
  );
}

function CacheSearch({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (result: CacheSearchResult) => void;
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

  return (
    <div className="rounded-xl border border-ink/10 bg-paper-raised p-3">
      <div className="flex gap-2">
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
          className="flex-1 rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={runSearch}
          disabled={disabled || isSearching || query.trim().length < 2}
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
          <p className="mt-2 rounded-lg border border-ink/10 bg-paper px-3 py-2 text-xs text-ink-muted">
            No cached products match &ldquo;{query}&rdquo;. Scan it yourself
            from the Scan tab — it&apos;ll show up here on the next reaction.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {results.map((r) => (
              <li key={r.barcode}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  disabled={disabled}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-ink/10 bg-paper px-3 py-2 text-left transition-colors hover:border-accent/40 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {r.name ?? `Barcode ${r.barcode}`}
                    </p>
                    {r.brand ? (
                      <p className="truncate text-xs text-ink-muted">{r.brand}</p>
                    ) : null}
                  </div>
                  <span className="text-xs text-ink-muted">Attach</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {results === null && !searchError ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
          <X className="h-3 w-3 opacity-0" aria-hidden="true" />
          Type at least 2 characters, then press Enter.
        </p>
      ) : null}
    </div>
  );
}
