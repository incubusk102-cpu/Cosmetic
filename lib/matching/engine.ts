import {
  ALLERGENS,
  ALLERGENS_BY_KEY,
  getAllergensByCategory,
} from "@/lib/allergens/data";
import type { AllergenEntry } from "@/lib/allergens/types";
import { normalizeIngredientList } from "./normalize";

export type Verdict = "safe" | "caution" | "avoid";

export interface UserAllergenSelection {
  /** Either a dictionary key OR a custom free-text label the user added. */
  allergen_key: string | null;
  /** Free-text label when the user adds a custom allergen not in the dictionary. */
  custom_label?: string | null;
}

export interface MatchedAllergen {
  /** The dictionary entry that matched, when known. Null for custom user entries. */
  entry: AllergenEntry | null;
  /** Display label — comes from the dictionary entry, or the user's custom label. */
  label: string;
  /** The ingredient token that triggered the match (already normalized). */
  matchedToken: string;
  /** The synonym that hit, if applicable. */
  matchedSynonym?: string;
  /** Whether this was a direct match (tracked allergen) or a "close relative" caution match. */
  kind: "direct" | "relative";
}

export interface MatchResult {
  verdict: Verdict;
  /** Direct hits on the user's tracked allergens. Drives the "avoid" verdict. */
  directMatches: MatchedAllergen[];
  /**
   * Same-category neighbors of tracked allergens that also appear.
   * Drives the "caution" verdict when there are no direct hits.
   */
  relativeMatches: MatchedAllergen[];
  /** The normalized tokens that were examined. */
  tokens: string[];
}

/**
 * Pure matching function. No I/O, no randomness, no time-dependent behavior.
 * Safe to unit-test exhaustively.
 *
 *  - If any user-tracked allergen is matched → "avoid".
 *  - Else, if any same-category neighbor of a tracked allergen is matched → "caution".
 *  - Else → "safe" (the UI must phrase this as "No matches in your list", not "safe to use").
 */
export function matchIngredients(
  rawIngredients: string,
  userAllergens: ReadonlyArray<UserAllergenSelection>,
): MatchResult {
  const tokens = normalizeIngredientList(rawIngredients);
  const tokenSet = new Set(tokens);

  // 1. Direct matches against the user's tracked allergens.
  const directMatches: MatchedAllergen[] = [];
  const trackedCategories = new Set<string>();
  const seenDirectKeys = new Set<string>();

  for (const ua of userAllergens) {
    // Custom user-defined allergen → free-text exact/substring match.
    if (ua.allergen_key === null && ua.custom_label) {
      const customLower = ua.custom_label.trim().toLowerCase();
      if (!customLower) continue;
      const hit = findTokenContaining(tokens, customLower);
      if (hit) {
        directMatches.push({
          entry: null,
          label: ua.custom_label,
          matchedToken: hit,
          kind: "direct",
        });
      }
      continue;
    }

    if (!ua.allergen_key) continue;
    const entry = ALLERGENS_BY_KEY.get(ua.allergen_key);
    if (!entry) continue;
    trackedCategories.add(entry.category);

    const hit = findSynonymMatch(tokens, tokenSet, entry.synonyms);
    if (hit && !seenDirectKeys.has(entry.key)) {
      directMatches.push({
        entry,
        label: entry.canonical,
        matchedToken: hit.token,
        matchedSynonym: hit.synonym,
        kind: "direct",
      });
      seenDirectKeys.add(entry.key);
    }
  }

  // 2. Same-category "relative" matches — only meaningful when no direct hits.
  const relativeMatches: MatchedAllergen[] = [];
  if (directMatches.length === 0 && trackedCategories.size > 0) {
    const seenRelKeys = new Set<string>();
    for (const cat of trackedCategories) {
      const peers = getAllergensByCategory(cat as AllergenEntry["category"]);
      for (const peer of peers) {
        if (seenRelKeys.has(peer.key)) continue;
        const hit = findSynonymMatch(tokens, tokenSet, peer.synonyms);
        if (hit) {
          relativeMatches.push({
            entry: peer,
            label: peer.canonical,
            matchedToken: hit.token,
            matchedSynonym: hit.synonym,
            kind: "relative",
          });
          seenRelKeys.add(peer.key);
        }
      }
    }
  }

  let verdict: Verdict;
  if (directMatches.length > 0) verdict = "avoid";
  else if (relativeMatches.length > 0) verdict = "caution";
  else verdict = "safe";

  return { verdict, directMatches, relativeMatches, tokens };
}

function findSynonymMatch(
  tokens: string[],
  tokenSet: ReadonlySet<string>,
  synonyms: string[],
): { token: string; synonym: string } | null {
  for (const syn of synonyms) {
    // Exact token match first (cheap & precise).
    if (tokenSet.has(syn)) return { token: syn, synonym: syn };
    // Then a word-boundary substring check on each token (e.g. "alcohol denat." vs "alcohol denat").
    const containing = findTokenContaining(tokens, syn);
    if (containing) return { token: containing, synonym: syn };
  }
  return null;
}

function findTokenContaining(tokens: string[], needle: string): string | null {
  if (!needle) return null;
  for (const t of tokens) {
    if (t === needle) return t;
    if (isWholeWordMatch(t, needle)) return t;
  }
  return null;
}

/**
 * Whole-word containment, so "linalool" matches the ingredient "linalool"
 * but does NOT match "trilinolein" (which contains "linol", not "linalool").
 */
function isWholeWordMatch(haystack: string, needle: string): boolean {
  if (haystack.length < needle.length) return false;
  const idx = haystack.indexOf(needle);
  if (idx === -1) return false;
  const before = idx === 0 ? " " : haystack[idx - 1];
  const after =
    idx + needle.length === haystack.length ? " " : haystack[idx + needle.length];
  return isWordBoundary(before) && isWordBoundary(after);
}

function isWordBoundary(ch: string | undefined): boolean {
  if (ch === undefined) return true;
  return !/[a-z0-9]/.test(ch);
}

/** Convenience helper — for the onboarding UI grouped picker. */
export function listAllergensGrouped(): Record<AllergenEntry["category"], AllergenEntry[]> {
  const out: Record<string, AllergenEntry[]> = {};
  for (const a of ALLERGENS) {
    (out[a.category] ||= []).push(a);
  }
  return out as Record<AllergenEntry["category"], AllergenEntry[]>;
}
