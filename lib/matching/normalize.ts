/**
 * Normalize raw ingredient text into a comparable form.
 *
 * Rules — kept deliberately conservative so behavior is explainable:
 *  - Lowercase.
 *  - Strip CI color-index parenthetical chunks: "(CI 12345)" or "ci 12345".
 *  - Normalize separators: replace "·", "•", "|", "/", "·", ";" with ",".
 *  - Collapse repeated whitespace.
 *  - Strip leading/trailing punctuation per token.
 *  - Strip parenthetical content that follows an ingredient (we keep the base name).
 */
export function normalizeIngredientList(raw: string): string[] {
  if (!raw) return [];

  let s = raw.toLowerCase();

  // Strip CI color-index references entirely
  s = s.replace(/\(ci\s*\d+\)/g, "");
  s = s.replace(/\bci\s*\d{4,}\b/g, "");

  // Normalize unicode separators commonly used in ingredient lists
  s = s.replace(/[·•|/;]+/g, ",");

  // Some labels use "/" or " - " between aliases (e.g. "aqua / water")
  s = s.replace(/\s+-\s+/g, ", ");

  // Strip newlines
  s = s.replace(/[\r\n]+/g, ", ");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  const tokens = s
    .split(",")
    .map((t) => stripTokenNoise(t))
    .filter((t) => t.length > 0);

  return tokens;
}

function stripTokenNoise(token: string): string {
  // Remove trailing parenthetical aliases: "limonene (d-limonene)" -> "limonene"
  // But preserve the base name only.
  let t = token.replace(/\([^)]*\)/g, "");
  // Strip leading/trailing punctuation and whitespace
  t = t.replace(/^[\s.,;:*\-]+|[\s.,;:*\-]+$/g, "");
  // Collapse internal whitespace
  t = t.replace(/\s+/g, " ");
  return t.trim();
}
