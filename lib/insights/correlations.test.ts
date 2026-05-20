import { describe, expect, it } from "vitest";
import {
  STRUCTURAL_FILTER,
  STRUCTURAL_FILTER_TOKENS,
  computeCorrelations,
  type CorrelationInputProduct,
} from "./correlations";

const opts = {
  // Lower the gates in tests so we can drive small synthetic histories.
  minProducts: 3,
  minReactedProducts: 2,
  minProductOccurrences: 2,
  ignoreTokens: [] as string[],
};

function p(id: string, ingredients: string): CorrelationInputProduct {
  return { id, ingredients_raw: ingredients };
}

describe("computeCorrelations", () => {
  it("returns eligible=false when there are too few products", () => {
    const out = computeCorrelations(
      [p("1", "linalool"), p("2", "linalool")],
      ["1"],
      opts,
    );
    expect(out.eligible).toBe(false);
    expect(out.reason).toBe("not_enough_products");
  });

  it("returns eligible=false when there are too few reacted products", () => {
    const out = computeCorrelations(
      [
        p("1", "linalool, glycerin"),
        p("2", "linalool, aqua"),
        p("3", "glycerin, aqua"),
      ],
      ["1"],
      opts,
    );
    expect(out.eligible).toBe(false);
    expect(out.reason).toBe("not_enough_reacted_products");
  });

  it("ranks the obvious culprit at the top by lift", () => {
    const out = computeCorrelations(
      [
        // 3 reacted products all share linalool; 3 clear ones do not.
        p("r1", "linalool, glycerin"),
        p("r2", "linalool, aqua"),
        p("r3", "linalool, citronellol"),
        p("c1", "glycerin, aqua"),
        p("c2", "glycerin, niacinamide"),
        p("c3", "aqua, niacinamide"),
      ],
      ["r1", "r2", "r3"],
      opts,
    );
    expect(out.eligible).toBe(true);
    expect(out.top[0]?.token).toBe("linalool");
    expect(out.top[0]?.reactedCount).toBe(3);
    expect(out.top[0]?.totalCount).toBe(3);
    expect(out.top[0]?.lift).toBeGreaterThan(1);
    // glycerin appears in 1 reacted + 2 clear products → lift below baseline → dropped.
    expect(out.top.find((r) => r.token === "glycerin")).toBeUndefined();
  });

  it("drops ingredients that only appear once even if all reacted", () => {
    const out = computeCorrelations(
      [
        p("r1", "rare-thing, glycerin"),
        p("r2", "linalool, glycerin"),
        p("r3", "linalool, citronellol"),
        p("c1", "glycerin, aqua"),
        p("c2", "glycerin, niacinamide"),
      ],
      ["r1", "r2", "r3"],
      opts,
    );
    expect(out.top.find((r) => r.token === "rare-thing")).toBeUndefined();
  });

  it("honors the default ignore list (water/aqua/parfum)", () => {
    const out = computeCorrelations(
      [
        p("r1", "aqua, linalool"),
        p("r2", "aqua, linalool"),
        p("r3", "aqua, citronellol"),
        p("c1", "aqua, glycerin"),
        p("c2", "aqua, niacinamide"),
      ],
      ["r1", "r2", "r3"],
      {
        minProducts: 3,
        minReactedProducts: 2,
        minProductOccurrences: 2,
        // Use default ignore list (no override).
      },
    );
    expect(out.eligible).toBe(true);
    expect(out.top.find((r) => r.token === "aqua")).toBeUndefined();
  });

  it("returns 'no_lift_signal' when nothing scores above baseline", () => {
    // Reactions are evenly distributed — every ingredient has lift exactly 1.
    const out = computeCorrelations(
      [
        p("r1", "a, b"),
        p("r2", "a, b"),
        p("c1", "a, b"),
        p("c2", "a, b"),
      ],
      ["r1", "r2"],
      opts,
    );
    expect(out.eligible).toBe(false);
    expect(out.reason).toBe("no_lift_signal");
    expect(out.top).toEqual([]);
  });

  it("caps the result list at topN", () => {
    const ingredients = Array.from({ length: 20 }, (_, i) => `ing${i}`);
    const reactedIngredient = (i: number) => ingredients.slice(0, i + 1).join(", ");
    const products: CorrelationInputProduct[] = [];
    for (let i = 0; i < 20; i++) {
      products.push(p(`r${i}`, reactedIngredient(i)));
    }
    // Add a few clear products that share nothing with reacted ones.
    for (let i = 0; i < 5; i++) {
      products.push(p(`c${i}`, "filler, padding"));
    }
    const out = computeCorrelations(
      products,
      products.filter((x) => x.id.startsWith("r")).map((x) => x.id),
      { ...opts, topN: 5 },
    );
    expect(out.eligible).toBe(true);
    expect(out.top.length).toBe(5);
    // Output is sorted by descending lift.
    for (let i = 1; i < out.top.length; i++) {
      const prev = out.top[i - 1];
      const curr = out.top[i];
      if (!prev || !curr) throw new Error("top row missing");
      expect(prev.lift).toBeGreaterThanOrEqual(curr.lift);
    }
  });

  it("computes lift correctly for a known scenario", () => {
    // 4 reacted out of 8 → baseline = 0.5. Linalool: 4/5 reacted = 0.8.
    // lift = 0.8 / 0.5 = 1.6.
    const out = computeCorrelations(
      [
        p("r1", "linalool, citronellol"),
        p("r2", "linalool, citronellol"),
        p("r3", "linalool, glycerin"),
        p("r4", "linalool, niacinamide"),
        p("c1", "linalool, niacinamide"),
        p("c2", "glycerin, niacinamide"),
        p("c3", "glycerin, niacinamide"),
        p("c4", "glycerin, niacinamide"),
      ],
      ["r1", "r2", "r3", "r4"],
      opts,
    );
    const lin = out.top.find((r) => r.token === "linalool");
    expect(lin).toBeDefined();
    expect(lin?.totalCount).toBe(5);
    expect(lin?.reactedCount).toBe(4);
    expect(lin?.lift).toBeCloseTo(1.6, 5);
  });

  it("accepts a Set for reactedProductIds", () => {
    const out = computeCorrelations(
      [
        p("r1", "linalool"),
        p("r2", "linalool"),
        p("r3", "linalool"),
        p("c1", "glycerin"),
        p("c2", "glycerin"),
      ],
      new Set(["r1", "r2", "r3"]),
      opts,
    );
    expect(out.eligible).toBe(true);
  });

  it("uses production-default gates (3 / 2 / 2) when called with no options", () => {
    // Locks in the shipped defaults so a future drift is an explicit
    // change. Three reacted products + three clear products, every
    // ingredient appears twice — the minimum that should clear the
    // 3/2/2 floor.
    const out = computeCorrelations(
      [
        p("r1", "linalool, glycerin"),
        p("r2", "linalool, citronellol"),
        p("r3", "linalool, niacinamide"),
        p("c1", "glycerin, niacinamide"),
        p("c2", "citronellol, niacinamide"),
        p("c3", "glycerin, citronellol"),
      ],
      ["r1", "r2", "r3"],
      // No options → uses production defaults.
    );
    expect(out.eligible).toBe(true);
    expect(out.top[0]?.token).toBe("linalool");
  });

  it("rejects with not_enough_products at the production default floor of 3", () => {
    const out = computeCorrelations(
      [p("1", "linalool"), p("2", "linalool")],
      ["1", "2"],
    );
    expect(out.eligible).toBe(false);
    expect(out.reason).toBe("not_enough_products");
  });
});

describe("STRUCTURAL_FILTER", () => {
  it("is non-empty and contains the canonical noise tokens", () => {
    // Locks in the editorial list. Adding/removing a token is an
    // intentional change; the test should fail loudly so docs/METHODOLOGY.md
    // and the /insights footnote stay in sync.
    expect(STRUCTURAL_FILTER.length).toBeGreaterThan(0);
    const tokens = STRUCTURAL_FILTER.map((e) => e.token);
    expect(tokens).toContain("aqua");
    expect(tokens).toContain("water");
    expect(tokens).toContain("parfum");
    expect(tokens).toContain("mica");
  });

  it("has all-lowercase tokens (so the ignoreSet compare works)", () => {
    for (const entry of STRUCTURAL_FILTER) {
      expect(entry.token).toBe(entry.token.toLowerCase());
      expect(entry.token.trim()).toBe(entry.token);
    }
  });

  it("has a non-empty label and reason for every entry", () => {
    for (const entry of STRUCTURAL_FILTER) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it("STRUCTURAL_FILTER_TOKENS mirrors STRUCTURAL_FILTER.tokens (no drift)", () => {
    expect(STRUCTURAL_FILTER_TOKENS).toEqual(STRUCTURAL_FILTER.map((e) => e.token));
  });

  it("is actually applied as the default ignore list", () => {
    // Build a history where the only ingredient that would have positive lift
    // is one of the structural tokens. With default filtering it must be dropped.
    const out = computeCorrelations(
      [
        p("r1", "aqua, linalool"),
        p("r2", "aqua, linalool"),
        p("r3", "aqua, citronellol"),
        p("c1", "aqua, glycerin"),
        p("c2", "aqua, niacinamide"),
      ],
      ["r1", "r2", "r3"],
      // No `ignoreTokens` override — use the production default.
      { minProducts: 3, minReactedProducts: 2, minProductOccurrences: 2 },
    );
    expect(out.eligible).toBe(true);
    expect(out.top.find((r) => r.token === "aqua")).toBeUndefined();
  });
});
