import type { AllergenEntry } from "./types";

/**
 * Curated allergen dictionary.
 *
 * Editorial rules:
 *  - Keys are stable. Renaming a key is a breaking change for user_allergens.
 *  - Synonyms are lowercased and trimmed at runtime; do not duplicate casing.
 *  - Only include synonyms that are unlikely to false-match unrelated ingredients.
 *  - Prefer INCI names. Avoid trade names.
 *  - This file is the source of truth — there is no allergens table in the DB.
 */
export const ALLERGENS: ReadonlyArray<AllergenEntry> = [
  // ── Fragrance — EU 26 (a representative subset for MVP) ────────────────────
  {
    key: "limonene",
    canonical: "Limonene",
    synonyms: ["limonene", "d-limonene", "l-limonene"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation:
      "Common citrus-scented fragrance compound; one of the EU's 26 declarable fragrance allergens.",
  },
  {
    key: "linalool",
    canonical: "Linalool",
    synonyms: ["linalool", "linalol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Floral fragrance compound; a frequent contact-allergy trigger when oxidized.",
  },
  {
    key: "geraniol",
    canonical: "Geraniol",
    synonyms: ["geraniol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Rose-scented fragrance compound; one of the EU's 26 declarable fragrance allergens.",
  },
  {
    key: "citronellol",
    canonical: "Citronellol",
    synonyms: ["citronellol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Rose/citrus fragrance compound on the EU 26 list.",
  },
  {
    key: "citral",
    canonical: "Citral",
    synonyms: ["citral"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Lemon-scented fragrance compound on the EU 26 list.",
  },
  {
    key: "eugenol",
    canonical: "Eugenol",
    synonyms: ["eugenol"],
    category: "fragrance",
    eu26: true,
    severity: 3,
    explanation: "Clove-scented compound; a stronger sensitizer on the EU 26 list.",
  },
  {
    key: "coumarin",
    canonical: "Coumarin",
    synonyms: ["coumarin"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Sweet hay-like fragrance compound on the EU 26 list.",
  },
  {
    key: "benzyl_alcohol",
    canonical: "Benzyl Alcohol",
    synonyms: ["benzyl alcohol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Used as both a fragrance ingredient and preservative; an EU 26 allergen.",
  },
  {
    key: "benzyl_benzoate",
    canonical: "Benzyl Benzoate",
    synonyms: ["benzyl benzoate"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Fragrance fixative on the EU 26 list.",
  },
  {
    key: "hydroxycitronellal",
    canonical: "Hydroxycitronellal",
    synonyms: ["hydroxycitronellal"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Muguet/lily-of-the-valley fragrance compound on the EU 26 list.",
  },
  // ── Fragrance — generic catch-all ─────────────────────────────────────────
  {
    key: "fragrance_generic",
    canonical: "Fragrance / Parfum",
    synonyms: ["fragrance", "parfum", "perfume", "aroma"],
    category: "fragrance",
    eu26: false,
    severity: 2,
    explanation:
      "Generic 'fragrance' or 'parfum' on a label can contain dozens of undisclosed compounds.",
  },

  // ── Preservatives ─────────────────────────────────────────────────────────
  {
    key: "methylisothiazolinone",
    canonical: "Methylisothiazolinone (MI)",
    synonyms: ["methylisothiazolinone"],
    category: "preservative",
    eu26: false,
    severity: 3,
    explanation: "A strong contact sensitizer; restricted in leave-on products in the EU.",
  },
  {
    key: "methylchloroisothiazolinone",
    canonical: "Methylchloroisothiazolinone (MCI)",
    synonyms: ["methylchloroisothiazolinone"],
    category: "preservative",
    eu26: false,
    severity: 3,
    explanation: "Often blended with MI; a known cause of contact dermatitis.",
  },
  {
    key: "parabens",
    canonical: "Parabens",
    synonyms: [
      "methylparaben",
      "ethylparaben",
      "propylparaben",
      "butylparaben",
      "isopropylparaben",
      "isobutylparaben",
    ],
    category: "preservative",
    eu26: false,
    severity: 2,
    explanation: "Preservative family; some users prefer to avoid the whole class.",
  },
  {
    key: "formaldehyde_releasers",
    canonical: "Formaldehyde Releasers",
    synonyms: [
      "dmdm hydantoin",
      "imidazolidinyl urea",
      "diazolidinyl urea",
      "quaternium-15",
      "bronopol",
      "2-bromo-2-nitropropane-1,3-diol",
    ],
    category: "preservative",
    eu26: false,
    severity: 3,
    explanation:
      "These slowly release formaldehyde to preserve a product; a known sensitizer family.",
  },
  {
    key: "phenoxyethanol",
    canonical: "Phenoxyethanol",
    synonyms: ["phenoxyethanol"],
    category: "preservative",
    eu26: false,
    severity: 1,
    explanation: "Widely used preservative; only relevant for users with known sensitivity.",
  },

  // ── Sulfates / surfactants ────────────────────────────────────────────────
  {
    key: "sls",
    canonical: "Sodium Lauryl Sulfate (SLS)",
    synonyms: ["sodium lauryl sulfate"],
    category: "sulfate",
    eu26: false,
    severity: 2,
    explanation: "A strong surfactant that can strip skin's barrier when used leave-on.",
  },
  {
    key: "sles",
    canonical: "Sodium Laureth Sulfate (SLES)",
    synonyms: ["sodium laureth sulfate"],
    category: "sulfate",
    eu26: false,
    severity: 1,
    explanation: "Milder than SLS but still a common sensitivity trigger for some users.",
  },

  // ── Retinoids ─────────────────────────────────────────────────────────────
  {
    key: "retinol",
    canonical: "Retinol / Retinoids",
    synonyms: [
      "retinol",
      "retinyl palmitate",
      "retinyl acetate",
      "retinaldehyde",
      "retinal",
      "hydroxypinacolone retinoate",
    ],
    category: "retinoid",
    eu26: false,
    severity: 2,
    explanation:
      "Vitamin A derivatives. Avoided by some users during pregnancy or for irritation.",
  },

  // ── Acids ─────────────────────────────────────────────────────────────────
  {
    key: "salicylic_acid",
    canonical: "Salicylic Acid",
    synonyms: ["salicylic acid"],
    category: "acid",
    eu26: false,
    severity: 2,
    explanation: "A BHA; some users avoid during pregnancy or alongside other actives.",
  },
  {
    key: "glycolic_acid",
    canonical: "Glycolic Acid",
    synonyms: ["glycolic acid"],
    category: "acid",
    eu26: false,
    severity: 2,
    explanation: "An AHA; can compound irritation when stacked with other exfoliants.",
  },
  {
    key: "lactic_acid",
    canonical: "Lactic Acid",
    synonyms: ["lactic acid"],
    category: "acid",
    eu26: false,
    severity: 1,
    explanation: "A milder AHA; tracked here only if a user has known sensitivity.",
  },

  // ── Essential oils ────────────────────────────────────────────────────────
  {
    key: "tea_tree_oil",
    canonical: "Tea Tree Oil",
    synonyms: ["tea tree oil", "melaleuca alternifolia leaf oil", "melaleuca alternifolia oil"],
    category: "essential_oil",
    eu26: false,
    severity: 2,
    explanation: "Essential oil; oxidized forms are a common contact-dermatitis trigger.",
  },
  {
    key: "lavender_oil",
    canonical: "Lavender Oil",
    synonyms: ["lavandula angustifolia oil", "lavender oil", "lavandula angustifolia"],
    category: "essential_oil",
    eu26: false,
    severity: 2,
    explanation: "Common essential oil; contains linalool and can sensitize over time.",
  },
  {
    key: "peppermint_oil",
    canonical: "Peppermint Oil",
    synonyms: ["mentha piperita oil", "peppermint oil", "mentha piperita"],
    category: "essential_oil",
    eu26: false,
    severity: 2,
    explanation: "Cooling essential oil that can be irritating to sensitive skin.",
  },

  // ── Sun filters ───────────────────────────────────────────────────────────
  {
    key: "oxybenzone",
    canonical: "Oxybenzone",
    synonyms: ["oxybenzone", "benzophenone-3"],
    category: "sun_filter",
    eu26: false,
    severity: 2,
    explanation: "Chemical UV filter; reported as a cause of photo-contact allergy.",
  },
  {
    key: "avobenzone",
    canonical: "Avobenzone",
    synonyms: ["avobenzone", "butyl methoxydibenzoylmethane"],
    category: "sun_filter",
    eu26: false,
    severity: 1,
    explanation: "Common chemical UV filter; occasional sensitivity reported.",
  },

  // ── Alcohol ───────────────────────────────────────────────────────────────
  {
    key: "denatured_alcohol",
    canonical: "Denatured Alcohol",
    synonyms: ["alcohol denat", "alcohol denat.", "denatured alcohol", "sd alcohol"],
    category: "alcohol",
    eu26: false,
    severity: 1,
    explanation: "High-percentage alcohol that can disrupt the skin barrier in leave-on products.",
  },

  // ── Other ─────────────────────────────────────────────────────────────────
  {
    key: "lanolin",
    canonical: "Lanolin",
    synonyms: ["lanolin", "lanolin alcohol", "lanolin oil"],
    category: "other",
    eu26: false,
    severity: 2,
    explanation: "Sheep-wool wax; a frequent cause of contact dermatitis in sensitive users.",
  },
  {
    key: "propylene_glycol",
    canonical: "Propylene Glycol",
    synonyms: ["propylene glycol"],
    category: "other",
    eu26: false,
    severity: 1,
    explanation: "Common humectant; only relevant for users with diagnosed sensitivity.",
  },
];

/** Indexed by key for O(1) lookup. */
export const ALLERGENS_BY_KEY: ReadonlyMap<string, AllergenEntry> = new Map(
  ALLERGENS.map((a) => [a.key, a]),
);

/** All allergens that share a category — used for "close relative" caution matching. */
export function getAllergensByCategory(category: AllergenEntry["category"]): AllergenEntry[] {
  return ALLERGENS.filter((a) => a.category === category);
}
