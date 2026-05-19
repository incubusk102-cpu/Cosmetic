"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { attachReactionToProduct } from "./actions";

export interface ProductOption {
  id: string;
  label: string;
}

/**
 * Inline affordance shown next to a reaction with `product_id IS NULL`.
 * Lets the user pick one of their own products and attach it to the
 * reaction so the correlations engine on /insights has data to chew on.
 */
export function AttachProductRow({
  reactionId,
  products,
}: {
  reactionId: string;
  products: ReadonlyArray<ProductOption>;
}) {
  const [productId, setProductId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (products.length === 0) {
    return (
      <p className="mt-3 text-xs text-ink-muted">
        Scan a product first, then come back here to attach this reaction to it.
      </p>
    );
  }

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

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2">
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
      <Button type="submit" variant="secondary" disabled={isPending || !productId}>
        {isPending ? "Attaching…" : "Attach"}
      </Button>
      {error ? <p className="w-full text-xs text-verdict-avoid">{error}</p> : null}
    </form>
  );
}
