/**
 * ILIKE search-query helpers for the product_cache.
 *
 * Two things to get right:
 *  - Reject queries that are too short, so we don't fire `%a%` against the
 *    cache and pull back unbounded garbage.
 *  - Escape ILIKE's own pattern metacharacters (`%`, `_`, `\`) so a user who
 *    types `100%_pure` doesn't accidentally match everything.
 *
 * Pure function: no I/O, no Supabase imports, fully unit-testable.
 */
export type SanitizedQuery =
  | { ok: true; pattern: string }
  | { ok: false; reason: "too_short" };

export const MIN_QUERY_LENGTH = 2;

export function sanitizeProductSearchQuery(raw: string): SanitizedQuery {
  const trimmed = raw.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { ok: false, reason: "too_short" };
  }
  // Order matters: escape backslashes first, then the SQL pattern wildcards.
  const escaped = trimmed
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return { ok: true, pattern: `%${escaped}%` };
}
