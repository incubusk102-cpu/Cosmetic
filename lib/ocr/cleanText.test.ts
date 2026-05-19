import { describe, expect, it } from "vitest";
import { cleanOcrText } from "./cleanText";
import { normalizeIngredientList } from "@/lib/matching/normalize";

describe("cleanOcrText", () => {
  it("returns empty string for empty input", () => {
    expect(cleanOcrText("")).toBe("");
  });

  it("strips an 'Ingredients:' header", () => {
    expect(cleanOcrText("Ingredients: Aqua, Glycerin")).toBe("Aqua, Glycerin");
  });

  it("strips a corrupted 'Ing redients :' header with stray spaces", () => {
    expect(cleanOcrText("Ing redients : Aqua, Glycerin")).toBe("Aqua, Glycerin");
  });

  it("strips a digit-substituted '1ngredients:' header", () => {
    expect(cleanOcrText("1ngredients: Aqua, Glycerin")).toBe("Aqua, Glycerin");
  });

  it("strips the alt-spelling 'Ingrediants:' header", () => {
    expect(cleanOcrText("Ingrediants: Aqua, Glycerin")).toBe("Aqua, Glycerin");
  });

  it("fixes O↔0 confusion in alpha-dominant tokens", () => {
    // Real OCR confusions: a 0 in the middle of letters is almost always an 'o'.
    expect(cleanOcrText("Glycer0l, S0rbitol, Phen0xyethanol")).toBe(
      "Glycerol, Sorbitol, Phenoxyethanol",
    );
  });

  it("fixes l↔1 confusion in alpha-dominant tokens", () => {
    expect(cleanOcrText("G1ycerin, Lina1ool")).toBe("Glycerin, Linalool");
  });

  it("fixes s↔5 confusion in alpha-dominant tokens", () => {
    expect(cleanOcrText("Pa55iflora")).toBe("Passiflora");
  });

  it("preserves CI color-index codes", () => {
    expect(cleanOcrText("Aqua, CI 12345, Glycerin")).toBe(
      "Aqua, CI 12345, Glycerin",
    );
  });

  it("preserves polymer chain suffixes like 'Ceteareth-20'", () => {
    expect(cleanOcrText("Ceteareth-20, Laureth-23")).toBe(
      "Ceteareth-20, Laureth-23",
    );
  });

  it("joins hyphenated line wraps without inserting a space", () => {
    expect(cleanOcrText("Glycer-\nin, Aqua")).toBe("Glycerin, Aqua");
  });

  it("joins hyphenated line wraps inside a polymer chain name", () => {
    // "Cete-\nareth-20" rejoins to "Ceteareth-20" — the trailing -20 stays
    // a digit-heavy suffix and is left untouched by the alpha-digit pass.
    expect(cleanOcrText("Cete-\nareth-20, Aqua")).toBe("Ceteareth-20, Aqua");
  });

  it("turns plain newlines into commas", () => {
    expect(cleanOcrText("Aqua\nGlycerin\nLinalool")).toBe(
      "Aqua, Glycerin, Linalool",
    );
  });

  it("collapses missing commas implied by newlines", () => {
    // Many labels print one ingredient per line with no commas.
    // After cleanOcrText, the existing normalizeIngredientList must produce
    // separate tokens.
    const cleaned = cleanOcrText("Ingredients:\nAqua\nGlycerin\nLinalool");
    const tokens = normalizeIngredientList(cleaned);
    expect(tokens).toEqual(["aqua", "glycerin", "linalool"]);
  });

  it("normalizes smart quotes and dashes", () => {
    expect(cleanOcrText("\u201CAqua\u201D \u2013 Glycerin")).toBe(
      '"Aqua" - Glycerin',
    );
  });

  it("strips soft hyphens", () => {
    expect(cleanOcrText("Gly\u00ADcerin, Aqua")).toBe("Glycerin, Aqua");
  });

  it("strips stray control characters", () => {
    expect(cleanOcrText("Aqua\x00\x07, Glycerin\x01")).toBe(
      "Aqua, Glycerin",
    );
  });

  it("collapses runs of whitespace and repeated commas", () => {
    expect(cleanOcrText("Aqua  ,,   Glycerin   ,  Linalool")).toBe(
      "Aqua, Glycerin, Linalool",
    );
  });

  it("pipes cleanly into normalizeIngredientList", () => {
    const raw = "Ing redients: Aqua, G1ycerin, Cete-\nareth-20, Lina1ool, Phen0xyethanol";
    const tokens = normalizeIngredientList(cleanOcrText(raw));
    expect(tokens).toContain("aqua");
    expect(tokens).toContain("glycerin");
    expect(tokens).toContain("linalool");
    expect(tokens).toContain("phenoxyethanol");
    // Polymer chain stays intact even if line-wrapped.
    expect(tokens).toContain("ceteareth-20");
  });
});
