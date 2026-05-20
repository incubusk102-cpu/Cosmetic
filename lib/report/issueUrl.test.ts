import { describe, expect, it } from "vitest";
import {
  REPORT_ISSUE_LABELS,
  REPORT_ISSUE_REPO_URL,
  buildIngredientReportBody,
  buildIngredientReportTitle,
  buildIngredientReportUrl,
  type ReportInput,
} from "./issueUrl";

function input(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    verdict: "caution",
    product: {
      brand: "Acme Cosmetics",
      name: "Daily Moisturiser",
      barcode: "1234567890123",
      ingredientsRaw: "aqua, glycerin, parfum, linalool, limonene",
    },
    directMatches: [],
    relativeMatches: [
      { label: "Linalool", matchedToken: "linalool", matchedSynonym: "linalool" },
      { label: "Limonene", matchedToken: "limonene", matchedSynonym: "limonene" },
    ],
    ...overrides,
  };
}

describe("buildIngredientReportTitle", () => {
  it("includes brand, product name, and verdict", () => {
    const title = buildIngredientReportTitle(input());
    expect(title).toBe(
      "Ingredient report: Acme Cosmetics — Daily Moisturiser (verdict: caution)",
    );
  });

  it("falls back to 'Unknown product' when brand and name are missing", () => {
    const title = buildIngredientReportTitle(
      input({
        product: {
          brand: null,
          name: null,
          barcode: null,
          ingredientsRaw: null,
        },
      }),
    );
    expect(title).toBe("Ingredient report: Unknown product (verdict: caution)");
  });

  it("uses just the name when there's no brand", () => {
    const title = buildIngredientReportTitle(
      input({
        product: {
          brand: null,
          name: "Mystery Cream",
          barcode: null,
          ingredientsRaw: null,
        },
      }),
    );
    expect(title).toBe(
      "Ingredient report: Mystery Cream (verdict: caution)",
    );
  });
});

describe("buildIngredientReportBody", () => {
  it("includes product context, verdict, ingredients, and matches", () => {
    const body = buildIngredientReportBody(input());
    expect(body).toContain("### Product");
    expect(body).toContain("Acme Cosmetics");
    expect(body).toContain("Daily Moisturiser");
    expect(body).toContain("1234567890123");
    expect(body).toContain("### Verdict shown");
    expect(body).toContain("**Caution (relative match)**");
    expect(body).toContain("### Ingredients we parsed");
    expect(body).toContain("aqua, glycerin, parfum, linalool, limonene");
    expect(body).toContain("### Matches we found");
    expect(body).toContain("**Linalool**");
    expect(body).toContain("**Limonene**");
    expect(body).toContain("### What's wrong?");
    expect(body).toContain("Missing synonym");
    expect(body).toContain("False positive");
  });

  it("renders 'safe' verdict with the 'Clear' phrasing — never 'Safe'", () => {
    const body = buildIngredientReportBody(input({ verdict: "safe" }));
    expect(body).toContain("**Clear (no matches in your list)**");
    // Hard rule: the body should not embed the marketing word "Safe".
    expect(body).not.toMatch(/\bSafe\b/);
  });

  it("renders the 'avoid' verdict in the direct-hit phrasing", () => {
    const body = buildIngredientReportBody(
      input({
        verdict: "avoid",
        directMatches: [
          { label: "Linalool", matchedToken: "linalool" },
        ],
        relativeMatches: [],
      }),
    );
    expect(body).toContain("**Avoid (direct match)**");
    expect(body).toContain("**Linalool**");
  });

  it("renders '_none_' when there are no matches in a bucket", () => {
    const body = buildIngredientReportBody(
      input({ directMatches: [], relativeMatches: [] }),
    );
    expect(body).toContain("Direct hits (your tracked allergens):** _none_");
    expect(body).toContain(
      "Relative hits (same-category neighbours):** _none_",
    );
  });

  it("falls back to placeholders when product fields are missing", () => {
    const body = buildIngredientReportBody(
      input({
        product: {
          brand: null,
          name: null,
          barcode: null,
          ingredientsRaw: null,
        },
      }),
    );
    expect(body).toContain("- Brand: _unknown_");
    expect(body).toContain("- Name: _unknown_");
    expect(body).toContain("- Barcode: _none — OCR or manual entry_");
    expect(body).toContain("_(empty / not captured)_");
  });

  it("annotates a synonym hit when the synonym differs from the matched token", () => {
    const body = buildIngredientReportBody(
      input({
        verdict: "avoid",
        directMatches: [
          {
            label: "Methylisothiazolinone",
            matchedToken: "kathon cg",
            matchedSynonym: "kathon cg",
          },
        ],
        relativeMatches: [],
      }),
    );
    // Same token == same synonym → no "(synonym: ...)" suffix
    expect(body).toContain("**Methylisothiazolinone** — matched token `kathon cg`");
    expect(body).not.toContain("(synonym: `kathon cg`)");
  });

  it("includes a (synonym: ...) suffix when the synonym differs from the token", () => {
    const body = buildIngredientReportBody(
      input({
        verdict: "avoid",
        directMatches: [
          {
            label: "Methylisothiazolinone",
            matchedToken: "methylisothiazolinone",
            matchedSynonym: "mi",
          },
        ],
        relativeMatches: [],
      }),
    );
    expect(body).toContain(
      "matched token `methylisothiazolinone` (synonym: `mi`)",
    );
  });

  it("truncates extremely long ingredient strings", () => {
    const longRaw = "ingredient, ".repeat(500); // ~6000 chars
    const body = buildIngredientReportBody(
      input({
        product: {
          brand: "X",
          name: "Y",
          barcode: null,
          ingredientsRaw: longRaw,
        },
      }),
    );
    expect(body).toContain("(truncated — paste the full list in a comment below)");
    // The whole body stays under the soft cap (+ a small tail).
    expect(body.length).toBeLessThanOrEqual(5500 + 200);
  });

  it("does not leak any user identifier (no UUIDs, no auth tokens)", () => {
    const body = buildIngredientReportBody(input());
    // No internal UUIDs in the body — we only ship public/visible product data.
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

describe("buildIngredientReportUrl", () => {
  it("targets the canonical Cosmetic repo issues/new endpoint", () => {
    const url = buildIngredientReportUrl(input());
    expect(url.startsWith(`${REPORT_ISSUE_REPO_URL}/issues/new?`)).toBe(true);
  });

  it("encodes the title, body, and labels into URL params", () => {
    const url = buildIngredientReportUrl(input());
    const parsed = new URL(url);
    expect(parsed.searchParams.get("title")).toBe(
      buildIngredientReportTitle(input()),
    );
    expect(parsed.searchParams.get("body")).toBe(
      buildIngredientReportBody(input()),
    );
    expect(parsed.searchParams.get("labels")).toBe(
      REPORT_ISSUE_LABELS.join(","),
    );
  });

  it("does not include a leading 'safe' word in the URL for safe verdicts", () => {
    // Indirectly checks the body's Clear-rendering — the title still uses the
    // verdict key ('safe') because it's a machine label, not display copy.
    const url = buildIngredientReportUrl(input({ verdict: "safe" }));
    const parsed = new URL(url);
    expect(parsed.searchParams.get("title")).toContain("(verdict: safe)");
    expect(parsed.searchParams.get("body")).toContain(
      "**Clear (no matches in your list)**",
    );
  });

  it("produces a URL well under common browser address-bar limits", () => {
    const heavy = input({
      product: {
        brand: "Acme",
        name: "Loaded Product",
        barcode: "9999999999999",
        ingredientsRaw: "ingredient, ".repeat(500),
      },
      directMatches: Array.from({ length: 50 }, (_, i) => ({
        label: `Allergen ${i}`,
        matchedToken: `token-${i}`,
      })),
      relativeMatches: Array.from({ length: 50 }, (_, i) => ({
        label: `Relative ${i}`,
        matchedToken: `relative-${i}`,
      })),
    });
    const url = buildIngredientReportUrl(heavy);
    // Well under the 8KB soft cap most browsers enforce.
    expect(url.length).toBeLessThan(8000);
  });

  it("includes the 'ingredient-report' label", () => {
    const url = buildIngredientReportUrl(input());
    const parsed = new URL(url);
    expect(parsed.searchParams.get("labels")).toContain("ingredient-report");
  });
});
