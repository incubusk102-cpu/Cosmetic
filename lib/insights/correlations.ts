/**
 * Reaction ↔ ingredient correlations.
 *
 * The product table doesn't store a pre-tokenized ingredient list — we keep
 * the raw label string instead. So this module takes the user's full product
 * history (with `ingredients_raw` for each row) plus the set of product IDs
 * that triggered a reaction, and computes a per-ingredient "lift":
 *
 *     lift(ingredient) = P(reaction | product contains ingredient)
 *                        / P(reaction)
 *
 * A lift > 1 means an ingredient shows up in reacted products at a higher
 * rate than the baseline reaction rate. Lift <= 1 is uninteresting.
 *
 * Filtering rules (avoid noise / spurious correlations):
 *  - Ignore ingredients that appear in fewer than `minProductOccurrences`
 *    products (default 3).
 *  - Ignore users with `< minProducts` total products (default 5) or
 *    `< minReactedProducts` reacted products (default 2). The caller can
 *    inspect `summary.eligible` to decide whether to render the table.
 *  - Ignore "structural" ingredients that show up in basically everything
 *    (water/aqua and basic colorants); we drop them via a default
 *    ignore list to avoid misleading top results.
 *
 * Pure function: no I/O, no time, fully unit-testable.
 */
import { normalizeIngredientList } from "@/lib/matching/normalize";

export interface CorrelationInputProduct {
  id: string;
  ingredients_raw: string | null;
}

export interface CorrelationOptions {
  minProducts?: number;
  minReactedProducts?: number;
  minProductOccurrences?: number;
  /** How many rows to include in the returned `top` list. */
  topN?: number;
  /**
   * Tokens (already normalized) to skip when building the table. Defaults to
   * common structural ingredients that wreck signal. Set to an empty array
   * to disable. */
  ignoreTokens?: ReadonlyArray<string>;
}

export interface CorrelationRow {
  token: string;
  /** How many of the user's products contain this ingredient. */
  totalCount: number;
  /** How many of those products triggered at least one reaction. */
  reactedCount: number;
  /** P(reaction | product contains ingredient). */
  reactionRate: number;
  /** Lift over baseline reaction rate. Values > 1 are interesting. */
  lift: number;
}

export interface CorrelationSummary {
  /** True iff there is enough data to render anything. */
  eligible: boolean;
  reason?:
    | "not_enough_products"
    | "not_enough_reacted_products"
    | "no_lift_signal";
  /** Counts that drive the eligibility decision. */
  totalProducts: number;
  reactedProducts: number;
  /** Baseline P(reaction) across all of the user's products. */
  baseRate: number;
  /** Top correlations by descending lift, capped to `topN`. */
  top: CorrelationRow[];
}

const DEFAULT_IGNORE: ReadonlyArray<string> = [
  "aqua",
  "water",
  "eau",
  "parfum",
  "fragrance",
  "ci 77891",
  "ci 77491",
  "ci 77492",
  "ci 77499",
  "ci 77019",
  "mica",
];

export function computeCorrelations(
  products: ReadonlyArray<CorrelationInputProduct>,
  reactedProductIds: ReadonlyArray<string> | ReadonlySet<string>,
  options: CorrelationOptions = {},
): CorrelationSummary {
  const {
    minProducts = 5,
    minReactedProducts = 2,
    minProductOccurrences = 3,
    topN = 10,
    ignoreTokens = DEFAULT_IGNORE,
  } = options;

  const reactedSet =
    reactedProductIds instanceof Set
      ? (reactedProductIds as ReadonlySet<string>)
      : new Set<string>(reactedProductIds);
  const ignoreSet = new Set(ignoreTokens.map((t) => t.toLowerCase()));

  const totalProducts = products.length;
  const reactedProducts = countReactedProducts(products, reactedSet);

  if (totalProducts < minProducts) {
    return {
      eligible: false,
      reason: "not_enough_products",
      totalProducts,
      reactedProducts,
      baseRate: 0,
      top: [],
    };
  }
  if (reactedProducts < minReactedProducts) {
    return {
      eligible: false,
      reason: "not_enough_reacted_products",
      totalProducts,
      reactedProducts,
      baseRate: 0,
      top: [],
    };
  }

  const baseRate = reactedProducts / totalProducts;

  // Count token occurrences across all products and reacted-only products.
  const totals = new Map<string, number>();
  const reactedTotals = new Map<string, number>();
  for (const product of products) {
    const tokens = uniqueTokens(product.ingredients_raw);
    const isReacted = reactedSet.has(product.id);
    for (const token of tokens) {
      if (ignoreSet.has(token)) continue;
      totals.set(token, (totals.get(token) ?? 0) + 1);
      if (isReacted) {
        reactedTotals.set(token, (reactedTotals.get(token) ?? 0) + 1);
      }
    }
  }

  const rows: CorrelationRow[] = [];
  for (const [token, count] of totals) {
    if (count < minProductOccurrences) continue;
    const reactedCount = reactedTotals.get(token) ?? 0;
    const reactionRate = reactedCount / count;
    const lift = baseRate === 0 ? 0 : reactionRate / baseRate;
    if (lift <= 1) continue;
    rows.push({ token, totalCount: count, reactedCount, reactionRate, lift });
  }

  rows.sort((a, b) => {
    if (b.lift !== a.lift) return b.lift - a.lift;
    if (b.reactedCount !== a.reactedCount) return b.reactedCount - a.reactedCount;
    return a.token.localeCompare(b.token);
  });

  if (rows.length === 0) {
    return {
      eligible: false,
      reason: "no_lift_signal",
      totalProducts,
      reactedProducts,
      baseRate,
      top: [],
    };
  }

  return {
    eligible: true,
    totalProducts,
    reactedProducts,
    baseRate,
    top: rows.slice(0, topN),
  };
}

function uniqueTokens(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(new Set(normalizeIngredientList(raw)));
}

function countReactedProducts(
  products: ReadonlyArray<CorrelationInputProduct>,
  reactedSet: ReadonlySet<string>,
): number {
  let n = 0;
  for (const p of products) if (reactedSet.has(p.id)) n++;
  return n;
}
