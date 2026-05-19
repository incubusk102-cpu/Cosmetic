import { describe, it, expect } from "vitest";
import { matchIngredients } from "./engine";
import { normalizeIngredientList } from "./normalize";

describe("normalizeIngredientList", () => {
  it("splits on commas and lowercases", () => {
    expect(normalizeIngredientList("Aqua, Glycerin, Linalool")).toEqual([
      "aqua",
      "glycerin",
      "linalool",
    ]);
  });

  it("strips CI color-index references", () => {
    expect(normalizeIngredientList("Aqua, CI 12345, Yellow 5 (CI 19140), Glycerin")).toEqual([
      "aqua",
      "yellow 5",
      "glycerin",
    ]);
  });

  it("normalizes unicode separators", () => {
    expect(normalizeIngredientList("aqua • glycerin | linalool / parfum")).toEqual([
      "aqua",
      "glycerin",
      "linalool",
      "parfum",
    ]);
  });

  it("strips parenthetical aliases but keeps the base name", () => {
    expect(normalizeIngredientList("Limonene (d-limonene), Linalool")).toEqual([
      "limonene",
      "linalool",
    ]);
  });

  it("collapses whitespace and drops empties", () => {
    expect(normalizeIngredientList("aqua,   ,linalool ,, ")).toEqual(["aqua", "linalool"]);
  });
});

describe("matchIngredients — verdicts", () => {
  it("returns 'safe' when no allergen is tracked and nothing matches", () => {
    const r = matchIngredients("Aqua, Glycerin, Squalane", []);
    expect(r.verdict).toBe("safe");
    expect(r.directMatches).toHaveLength(0);
    expect(r.relativeMatches).toHaveLength(0);
  });

  it("returns 'avoid' when a tracked allergen appears as an ingredient token", () => {
    const r = matchIngredients("Aqua, Glycerin, Linalool, Parfum", [
      { allergen_key: "linalool" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches).toHaveLength(1);
    expect(r.directMatches[0]!.entry?.key).toBe("linalool");
    expect(r.directMatches[0]!.matchedToken).toBe("linalool");
  });

  it("returns 'avoid' for multi-synonym allergens like parabens", () => {
    const r = matchIngredients("aqua, methylparaben, glycerin", [
      { allergen_key: "parabens" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("parabens");
    expect(r.directMatches[0]!.matchedSynonym).toBe("methylparaben");
  });

  it("returns 'caution' when a same-category neighbor matches but the tracked one does not", () => {
    // User tracks linalool; product contains geraniol (both EU 26 fragrance).
    const r = matchIngredients("Aqua, Glycerin, Geraniol", [{ allergen_key: "linalool" }]);
    expect(r.verdict).toBe("caution");
    expect(r.directMatches).toHaveLength(0);
    expect(r.relativeMatches.map((m) => m.entry?.key)).toContain("geraniol");
  });

  it("'avoid' wins over 'caution' when both occur", () => {
    const r = matchIngredients("Aqua, Linalool, Geraniol", [{ allergen_key: "linalool" }]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches.map((m) => m.entry?.key)).toEqual(["linalool"]);
    expect(r.relativeMatches).toHaveLength(0);
  });

  it("does not falsely match a substring across an unrelated word", () => {
    // "trilinolein" contains "linol" but NOT "linalool" — also must not match "linalool".
    const r = matchIngredients("Aqua, Trilinolein, Glycerin", [{ allergen_key: "linalool" }]);
    expect(r.verdict).toBe("safe");
    expect(r.directMatches).toHaveLength(0);
  });

  it("matches custom user allergens via free-text", () => {
    const r = matchIngredients("Aqua, Cetearyl Alcohol, Glycerin", [
      { allergen_key: null, custom_label: "Cetearyl Alcohol" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.label).toBe("Cetearyl Alcohol");
  });

  it("matches generic 'parfum' for users tracking generic fragrance", () => {
    const r = matchIngredients("Aqua, Glycerin, Parfum", [
      { allergen_key: "fragrance_generic" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("fragrance_generic");
    expect(r.directMatches[0]!.matchedSynonym).toBe("parfum");
  });

  it("matches alcohol denat. with a trailing period", () => {
    const r = matchIngredients("Aqua, Alcohol Denat., Glycerin", [
      { allergen_key: "denatured_alcohol" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("denatured_alcohol");
  });

  it("ignores unknown allergen keys without throwing", () => {
    const r = matchIngredients("Aqua, Linalool", [{ allergen_key: "not_a_real_key" }]);
    expect(r.verdict).toBe("safe");
  });

  it("deduplicates direct matches when the same allergen appears via multiple synonyms", () => {
    const r = matchIngredients("Aqua, Methylparaben, Propylparaben", [
      { allergen_key: "parabens" },
    ]);
    expect(r.directMatches).toHaveLength(1);
    expect(r.directMatches[0]!.entry?.key).toBe("parabens");
  });

  it("returns the tokens it examined for transparency", () => {
    const r = matchIngredients("Aqua, Glycerin, Linalool", [{ allergen_key: "linalool" }]);
    expect(r.tokens).toEqual(["aqua", "glycerin", "linalool"]);
  });
});

describe("matchIngredients — explainability invariants", () => {
  it("every direct match carries a non-empty matched token", () => {
    const r = matchIngredients("Aqua, Methylisothiazolinone, Glycerin", [
      { allergen_key: "methylisothiazolinone" },
    ]);
    for (const m of r.directMatches) {
      expect(m.matchedToken.length).toBeGreaterThan(0);
    }
  });

  it("relative matches only appear when there are no direct matches", () => {
    const r = matchIngredients("Aqua, Linalool, Geraniol", [
      { allergen_key: "linalool" },
    ]);
    expect(r.directMatches.length).toBeGreaterThan(0);
    expect(r.relativeMatches).toHaveLength(0);
  });

  it("safe verdict has no matches at all", () => {
    const r = matchIngredients("Aqua, Glycerin, Squalane", [{ allergen_key: "linalool" }]);
    expect(r.verdict).toBe("safe");
    expect(r.directMatches).toHaveLength(0);
    expect(r.relativeMatches).toHaveLength(0);
  });
});
