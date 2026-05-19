/**
 * Clean raw OCR output from an ingredient-list photograph so it can be fed
 * into the existing `normalizeIngredientList` → `matchIngredients` pipeline.
 *
 * OCR garbage we handle:
 *  - Header noise: "Ingredients:", "INGREDIENTS / INC1:", and corrupted variants
 *    like "Ing redients:" or "1ngredients" that the OCR engine emits when text
 *    is on a curved surface.
 *  - Hard line wraps inside a single ingredient — both plain ("Cetearyl\nAlcohol")
 *    and hyphenated ("Glycer-\nin" → "Glycerin", "Ceteareth-\n20" → "Ceteareth-20").
 *  - Other line breaks → comma (typical labels print one ingredient per line).
 *  - Smart quotes, en/em dashes, and stray control characters.
 *  - Digit↔letter confusion in alpha-dominant tokens:
 *      "Aqu0"   → "Aqua"
 *      "G1ycerin" → "Glycerin"
 *      "Lina100l" → "Linalool"
 *      "Pa55ifl0ra" → "Passiflora"
 *    We deliberately do NOT touch digit-dominant tokens (e.g. "CI 12345",
 *    "Ceteareth-20", "Laureth-23") so we don't corrupt color-index codes or
 *    polymer chain numbers.
 *
 * Everything else (token splitting, lowercasing, alias-paren stripping) is
 * still done downstream by `normalizeIngredientList`. This function only
 * exists to make OCR output _look like_ a label-typed ingredient string.
 */
export function cleanOcrText(raw: string): string {
  if (!raw) return "";

  let s = raw;

  // 1. Normalize smart quotes, en/em dashes, soft hyphens, and stray controls.
  s = s.replace(/[\u2018\u2019\u02BC\u201A\u2032]/g, "'");
  s = s.replace(/[\u201C\u201D\u201E\u2033]/g, '"');
  s = s.replace(/[\u2013\u2014\u2212]/g, "-");
  s = s.replace(/\u00AD/g, ""); // soft hyphen
  // Strip non-printing control chars (but keep newlines for hyphen-join below).
  s = s.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ");

  // 2. Join hyphenated line wraps BEFORE we collapse newlines.
  //    "Glycer-\n  in" → "Glycerin"  (no space before the wrap continuation)
  s = s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu, "$1$2");

  // 3. Strip "Ingredients:" header — including OCR-mangled variants.
  //    Handles internal spaces ("Ing redients :"), digit substitution
  //    ("1ngredients"), and the common alt-spelling "Ingrediants".
  const INGREDIENTS_HEADER =
    /(?:^|\n|[.,;])\s*[*\-•·]*\s*[i1]\s*n\s*g\s*r\s*[e3]?\s*d\s*[i1]?\s*[ea]\s*n\s*t\s*s?\s*[:.\-]\s*/i;
  s = s.replace(INGREDIENTS_HEADER, " ");

  // 4. Remaining newlines → comma (one ingredient per line is the norm).
  s = s.replace(/[\r\n]+/g, ", ");

  // 5. Fix digit↔letter confusion in alpha-dominant tokens.
  //    We split on word boundaries that are safe to preserve (whitespace,
  //    commas, parentheses, slashes) and only rewrite the alpha-dominant ones.
  s = s
    .split(/([,\s()\[\]/|;:]+)/)
    .map(fixAlphaDigitsInToken)
    .join("");

  // 6. Tidy punctuation: collapse whitespace, then collapse whitespace-before-commas
  //    and runs of commas left behind by stripped control chars / repeated separators.
  s = s.replace(/\s+/g, " ");
  s = s.replace(/\s+([,;:])/g, "$1");
  s = s.replace(/,(\s*,)+/g, ",");
  s = s.trim();

  // 7. Strip leading punctuation/whitespace runs left over from header removal.
  s = s.replace(/^[\s,.:;\-]+/, "");

  return s;
}

/**
 * Replace OCR'd digits inside an alpha-dominant token with their visual
 * letter equivalents. Skip the token entirely if it looks like a real
 * numeric code (more digits than letters, or contains a hyphen+digits suffix
 * like "ceteareth-20").
 */
function fixAlphaDigitsInToken(token: string): string {
  if (!token) return token;
  // Pure separator chunks come back from .split() — pass them through.
  if (/^[,\s()\[\]/|;:]+$/.test(token)) return token;

  const digits = token.match(/[015]/g)?.length ?? 0;
  const letters = token.match(/[a-z]/gi)?.length ?? 0;

  // No digits to fix — done.
  if (digits === 0) return token;
  // Digit-heavy tokens are likely codes (CI numbers, "-20" suffixes). Leave alone.
  if (digits >= letters) return token;
  // Tokens with a hyphen followed by digits look like "ceteareth-20" — leave alone.
  if (/-\d/.test(token)) return token;

  return token
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/5/g, "s");
}
