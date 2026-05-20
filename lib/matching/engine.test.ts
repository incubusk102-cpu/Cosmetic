import { describe, it, expect } from "vitest";
import { matchIngredients } from "./engine";
import { normalizeIngredientList } from "./normalize";
import { ALLERGENS, ALLERGENS_BY_KEY } from "@/lib/allergens/data";

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

describe("allergen dictionary v2 — EU 26 completeness", () => {
  it("contains exactly 26 EU-declarable fragrance allergens", () => {
    // Annex III of EC 1223/2009. The list is exactly 26; if this fails the
    // dictionary has drifted from the regulation. Update both data.ts and
    // docs/METHODOLOGY.md together.
    const eu26 = ALLERGENS.filter((a) => a.eu26);
    expect(eu26).toHaveLength(26);
  });

  it("every EU 26 entry is categorized as 'fragrance'", () => {
    for (const a of ALLERGENS.filter((a) => a.eu26)) {
      expect(a.category).toBe("fragrance");
    }
  });

  it("includes the v2 expansion entries by key", () => {
    // Lock the editorial list so a future deletion fails loudly.
    const v2Keys = [
      "amyl_cinnamal",
      "amylcinnamyl_alcohol",
      "anise_alcohol",
      "benzyl_cinnamate",
      "benzyl_salicylate",
      "butylphenyl_methylpropional",
      "cinnamal",
      "cinnamyl_alcohol",
      "farnesol",
      "hexyl_cinnamal",
      "hicc",
      "isoeugenol",
      "isomethyl_ionone",
      "methyl_2_octynoate",
      "oakmoss",
      "treemoss",
    ];
    for (const k of v2Keys) {
      expect(ALLERGENS_BY_KEY.has(k), `missing v2 EU 26 key: ${k}`).toBe(true);
    }
  });
});

describe("allergen dictionary v2 — matches for new entries", () => {
  it("matches Cinnamal (with hyphenated synonym variants normalized)", () => {
    const r = matchIngredients("Aqua, Cinnamal, Glycerin", [
      { allergen_key: "cinnamal" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("cinnamal");
  });

  it("matches Cinnamic Aldehyde via the cinnamal synonym list", () => {
    const r = matchIngredients("Aqua, Cinnamic Aldehyde, Glycerin", [
      { allergen_key: "cinnamal" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.matchedSynonym).toBe("cinnamic aldehyde");
  });

  it("matches Lyral via the HICC synonym list", () => {
    const r = matchIngredients(
      "Aqua, Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde, Glycerin",
      [{ allergen_key: "hicc" }],
    );
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("hicc");
  });

  it("matches Oakmoss via 'Evernia Prunastri Extract' INCI name", () => {
    const r = matchIngredients(
      "Aqua, Evernia Prunastri Extract, Glycerin",
      [{ allergen_key: "oakmoss" }],
    );
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("oakmoss");
  });

  it("matches Lilial via 'Butylphenyl Methylpropional' INCI name", () => {
    const r = matchIngredients(
      "Aqua, Butylphenyl Methylpropional, Glycerin",
      [{ allergen_key: "butylphenyl_methylpropional" }],
    );
    expect(r.verdict).toBe("avoid");
  });

  it("EU 26 expansion fires same-category caution across new and existing entries", () => {
    // User tracks limonene (existing); product has cinnamal (v2 addition).
    // Both are category=fragrance → caution.
    const r = matchIngredients("Aqua, Cinnamal, Glycerin", [
      { allergen_key: "limonene" },
    ]);
    expect(r.verdict).toBe("caution");
    expect(r.relativeMatches.map((m) => m.entry?.key)).toContain("cinnamal");
  });

  it("matches BIT (Benzisothiazolinone) as a new isothiazolinone preservative", () => {
    const r = matchIngredients("Aqua, Benzisothiazolinone, Glycerin", [
      { allergen_key: "benzisothiazolinone" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("benzisothiazolinone");
  });

  it("MI tightened synonyms match the IUPAC form '2-methyl-4-isothiazolin-3-one'", () => {
    const r = matchIngredients(
      "Aqua, 2-Methyl-4-Isothiazolin-3-One, Glycerin",
      [{ allergen_key: "methylisothiazolinone" }],
    );
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("methylisothiazolinone");
  });

  it("MI catches the user tracking BIT via the preservative-category relative", () => {
    // User tracks MI; product has BIT (a new isothiazolinone). Cross-reaction
    // is the well-documented clinical reason BIT was added; the engine treats
    // it as a same-category relative.
    const r = matchIngredients("Aqua, Benzisothiazolinone, Glycerin", [
      { allergen_key: "methylisothiazolinone" },
    ]);
    expect(r.verdict).toBe("caution");
    expect(r.relativeMatches.map((m) => m.entry?.key)).toContain(
      "benzisothiazolinone",
    );
  });

  it("matches ALS via 'Ammonium Lauryl Sulfate'", () => {
    const r = matchIngredients("Aqua, Ammonium Lauryl Sulfate, Glycerin", [
      { allergen_key: "als" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.entry?.key).toBe("als");
  });

  it("ALS triggers caution when user tracks SLS (same sulfate category)", () => {
    const r = matchIngredients("Aqua, Ammonium Lauryl Sulfate, Glycerin", [
      { allergen_key: "sls" },
    ]);
    expect(r.verdict).toBe("caution");
    expect(r.relativeMatches.map((m) => m.entry?.key)).toContain("als");
  });

  it("matches benzylparaben (v2 paraben family extension)", () => {
    const r = matchIngredients("Aqua, Benzylparaben, Glycerin", [
      { allergen_key: "parabens" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.matchedSynonym).toBe("benzylparaben");
  });

  it("matches pentylparaben (v2 paraben family extension)", () => {
    const r = matchIngredients("Aqua, Pentylparaben, Glycerin", [
      { allergen_key: "parabens" },
    ]);
    expect(r.verdict).toBe("avoid");
    expect(r.directMatches[0]!.matchedSynonym).toBe("pentylparaben");
  });
});

describe("allergen dictionary v2 — editorial invariants", () => {
  it("every entry has at least one synonym", () => {
    for (const a of ALLERGENS) {
      expect(a.synonyms.length, `entry ${a.key} has no synonyms`).toBeGreaterThan(0);
    }
  });

  it("every synonym is lowercase and trimmed (the matcher relies on this)", () => {
    for (const a of ALLERGENS) {
      for (const s of a.synonyms) {
        expect(s).toBe(s.toLowerCase());
        expect(s.trim()).toBe(s);
        expect(s.length).toBeGreaterThan(0);
      }
    }
  });

  it("every entry has a unique key", () => {
    const keys = ALLERGENS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry has a non-empty canonical name and explanation", () => {
    for (const a of ALLERGENS) {
      expect(a.canonical.length).toBeGreaterThan(0);
      expect(a.explanation.length).toBeGreaterThan(0);
    }
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
