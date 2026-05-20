/**
 * Builds a prefilled GitHub "new issue" URL from a verdict-screen context.
 *
 * Pure. No I/O, no randomness, no time-dependent behavior. The verdict screen
 * renders the link via {@link buildIngredientReportUrl}; the engine itself is
 * not coupled to this module.
 *
 * Why this exists: PLAN.md §12 risk #6 — the matching engine can miss a
 * synonym (e.g. "Kathon CG" for methylisothiazolinone) and produce a false
 * "Clear". The mitigation is a one-click report path from every verdict
 * screen so the editorial loop sees the miss.
 *
 * Privacy: the body only includes data already visible on the verdict screen
 * (brand, name, barcode, ingredients string, matches). No user_id, no
 * product UUID, no allergen-list contents.
 */

export const REPORT_ISSUE_REPO_URL =
  "https://github.com/incubusk102-cpu/Cosmetic";
export const REPORT_ISSUE_LABELS = ["ingredient-report"];

// Soft caps. GitHub will accept much longer URLs, but the page renders better
// with a body that fits in a single screenful, and very long URLs trip some
// mobile browsers' address-bar truncation.
const MAX_INGREDIENTS_CHARS = 1000;
const MAX_MATCHES_LISTED = 30;
const MAX_BODY_CHARS = 5500;

export type ReportVerdict = "safe" | "caution" | "avoid";

export interface ReportProductContext {
  brand: string | null;
  name: string | null;
  barcode: string | null;
  ingredientsRaw: string | null;
}

export interface ReportMatch {
  /** Canonical or user-supplied display label. */
  label: string;
  /** The normalized ingredient token that triggered the match. */
  matchedToken: string;
  /** The synonym that hit, if different from the token. */
  matchedSynonym?: string | null;
}

export interface ReportInput {
  verdict: ReportVerdict;
  product: ReportProductContext;
  directMatches: ReportMatch[];
  relativeMatches: ReportMatch[];
}

const VERDICT_DISPLAY: Record<ReportVerdict, string> = {
  safe: "Clear (no matches in your list)",
  caution: "Caution (relative match)",
  avoid: "Avoid (direct match)",
};

export function buildIngredientReportTitle(input: ReportInput): string {
  const product = [input.product.brand, input.product.name]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s))
    .join(" — ");
  const label = product || "Unknown product";
  return `Ingredient report: ${label} (verdict: ${input.verdict})`;
}

export function buildIngredientReportBody(input: ReportInput): string {
  const lines: string[] = [];

  lines.push("## Ingredient report");
  lines.push("");
  lines.push(
    "I think the verdict on this product was wrong (or right, but missing context).",
  );
  lines.push("");

  lines.push("### Product");
  lines.push(`- Brand: ${input.product.brand?.trim() || "_unknown_"}`);
  lines.push(`- Name: ${input.product.name?.trim() || "_unknown_"}`);
  lines.push(
    `- Barcode: ${input.product.barcode?.trim() || "_none — OCR or manual entry_"}`,
  );
  lines.push("");

  lines.push("### Verdict shown");
  lines.push(`**${VERDICT_DISPLAY[input.verdict]}**`);
  lines.push("");

  lines.push("### Ingredients we parsed");
  const rawIng = (input.product.ingredientsRaw ?? "").trim();
  if (rawIng) {
    const truncated =
      rawIng.length > MAX_INGREDIENTS_CHARS
        ? rawIng.slice(0, MAX_INGREDIENTS_CHARS) +
          " … (truncated — paste the full list in a comment below)"
        : rawIng;
    lines.push("```");
    lines.push(truncated);
    lines.push("```");
  } else {
    lines.push("_(empty / not captured)_");
  }
  lines.push("");

  lines.push("### Matches we found");
  lines.push(
    `- **Direct hits (your tracked allergens):** ${formatMatches(input.directMatches)}`,
  );
  lines.push(
    `- **Relative hits (same-category neighbours):** ${formatMatches(input.relativeMatches)}`,
  );
  lines.push("");

  lines.push("### What's wrong? (check one or more)");
  lines.push(
    "- [ ] Missing synonym — an allergen wasn't recognised under one of its names",
  );
  lines.push(
    "- [ ] False positive — an ingredient was matched that shouldn't have been",
  );
  lines.push("- [ ] Wrong category — the relative-match family is wrong");
  lines.push(
    "- [ ] Outdated ingredient list — Open Beauty Facts has stale data for this barcode",
  );
  lines.push("- [ ] Other (describe below)");
  lines.push("");

  lines.push("### Notes (optional)");
  lines.push("<!-- Add any extra context here. -->");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("_Submitted from the Cosmetic Allergy Tracker verdict screen._");
  lines.push(
    "_No personal data is shared — only the product + ingredients shown on the verdict._",
  );

  let body = lines.join("\n");
  if (body.length > MAX_BODY_CHARS) {
    body =
      body.slice(0, MAX_BODY_CHARS) +
      "\n\n_…body truncated to fit the URL — paste extra detail in a comment._";
  }
  return body;
}

export function buildIngredientReportUrl(input: ReportInput): string {
  const title = buildIngredientReportTitle(input);
  const body = buildIngredientReportBody(input);
  const params = new URLSearchParams({
    title,
    body,
    labels: REPORT_ISSUE_LABELS.join(","),
  });
  return `${REPORT_ISSUE_REPO_URL}/issues/new?${params.toString()}`;
}

function formatMatches(matches: ReportMatch[]): string {
  if (matches.length === 0) return "_none_";
  const head = matches.slice(0, MAX_MATCHES_LISTED).map((m) => {
    const synBit =
      m.matchedSynonym && m.matchedSynonym !== m.matchedToken
        ? ` (synonym: \`${m.matchedSynonym}\`)`
        : "";
    return `**${m.label}** — matched token \`${m.matchedToken}\`${synBit}`;
  });
  const more =
    matches.length > MAX_MATCHES_LISTED
      ? ` (+ ${matches.length - MAX_MATCHES_LISTED} more)`
      : "";
  return "\n" + head.map((s) => `    - ${s}`).join("\n") + more;
}
