export type AllergenCategory =
  | "fragrance"
  | "preservative"
  | "sulfate"
  | "retinoid"
  | "acid"
  | "essential_oil"
  | "silicone"
  | "sun_filter"
  | "alcohol"
  | "other";

/**
 * Severity tier is informational only. It does NOT imply medical risk.
 *   1 — commonly tolerated, only relevant when user opts in
 *   2 — frequently reported sensitizer
 *   3 — known strong sensitizer / regulated
 */
export type SeverityTier = 1 | 2 | 3;

export interface AllergenEntry {
  /** Stable internal key, never displayed to the user. snake_case. */
  key: string;
  /** Display name shown in UI and reports. */
  canonical: string;
  /** Lowercased INCI / common-name strings to match against an ingredient list. */
  synonyms: string[];
  category: AllergenCategory;
  /** Member of the EU's 26 fragrance allergens that must be declared on labels. */
  eu26: boolean;
  severity: SeverityTier;
  /** One short, plain-language sentence shown on the verdict screen. */
  explanation: string;
}
