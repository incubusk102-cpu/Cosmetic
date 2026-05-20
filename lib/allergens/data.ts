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
  // ── Fragrance — EU 26 declarables (Annex III of EC 1223/2009) ──────────────
  // The 26 substances cosmetic products must declare on-label if present above
  // 0.001% (leave-on) / 0.01% (rinse-off). Each entry below maps to one of
  // those 26. Keep this list complete and alphabetized; see docs/METHODOLOGY.md.
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
  // ── Fragrance — EU 26 (v2 expansion, completes the Annex III list) ────────
  {
    key: "amyl_cinnamal",
    canonical: "Amyl Cinnamal",
    synonyms: ["amyl cinnamal", "amylcinnamaldehyde", "alpha-amyl cinnamaldehyde"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Jasmine-like fragrance compound on the EU 26 list.",
  },
  {
    key: "amylcinnamyl_alcohol",
    canonical: "Amylcinnamyl Alcohol",
    synonyms: ["amylcinnamyl alcohol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Floral fragrance alcohol on the EU 26 list.",
  },
  {
    key: "anise_alcohol",
    canonical: "Anise Alcohol",
    synonyms: ["anise alcohol", "anisic alcohol", "anisyl alcohol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Sweet anise-like fragrance compound on the EU 26 list.",
  },
  {
    key: "benzyl_cinnamate",
    canonical: "Benzyl Cinnamate",
    synonyms: ["benzyl cinnamate"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Balsamic fragrance fixative on the EU 26 list.",
  },
  {
    key: "benzyl_salicylate",
    canonical: "Benzyl Salicylate",
    synonyms: ["benzyl salicylate"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Floral/balsam fragrance compound on the EU 26 list.",
  },
  {
    key: "butylphenyl_methylpropional",
    canonical: "Butylphenyl Methylpropional (Lilial)",
    synonyms: ["butylphenyl methylpropional", "lilial", "p-bmhca"],
    category: "fragrance",
    eu26: true,
    severity: 3,
    explanation:
      "Lily-of-the-valley fragrance compound; banned in EU cosmetics since 2022 but still found in legacy or non-EU products.",
  },
  {
    key: "cinnamal",
    canonical: "Cinnamal",
    synonyms: ["cinnamal", "cinnamaldehyde", "cinnamic aldehyde"],
    category: "fragrance",
    eu26: true,
    severity: 3,
    explanation: "Cinnamon-bark fragrance compound; a known stronger sensitizer on the EU 26 list.",
  },
  {
    key: "cinnamyl_alcohol",
    canonical: "Cinnamyl Alcohol",
    synonyms: ["cinnamyl alcohol", "cinnamic alcohol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Hyacinth-like fragrance alcohol on the EU 26 list.",
  },
  {
    key: "farnesol",
    canonical: "Farnesol",
    synonyms: ["farnesol"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Soft floral fragrance compound on the EU 26 list.",
  },
  {
    key: "hexyl_cinnamal",
    canonical: "Hexyl Cinnamal",
    synonyms: ["hexyl cinnamal", "alpha-hexyl cinnamaldehyde"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Jasmine-like fragrance compound on the EU 26 list.",
  },
  {
    key: "hicc",
    canonical: "Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde (HICC / Lyral)",
    synonyms: [
      "hydroxyisohexyl 3-cyclohexene carboxaldehyde",
      "hicc",
      "lyral",
    ],
    category: "fragrance",
    eu26: true,
    severity: 3,
    explanation:
      "Strong sensitizer; banned in EU cosmetics since 2021 but still found in legacy products.",
  },
  {
    key: "isoeugenol",
    canonical: "Isoeugenol",
    synonyms: ["isoeugenol"],
    category: "fragrance",
    eu26: true,
    severity: 3,
    explanation: "Clove/spice fragrance compound; a stronger sensitizer on the EU 26 list.",
  },
  {
    key: "isomethyl_ionone",
    canonical: "alpha-Isomethyl Ionone",
    synonyms: ["alpha-isomethyl ionone", "isomethyl ionone"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Violet/iris fragrance compound on the EU 26 list.",
  },
  {
    key: "methyl_2_octynoate",
    canonical: "Methyl 2-Octynoate",
    synonyms: ["methyl 2-octynoate", "methyl heptin carbonate"],
    category: "fragrance",
    eu26: true,
    severity: 2,
    explanation: "Green/violet fragrance compound on the EU 26 list.",
  },
  {
    key: "oakmoss",
    canonical: "Oakmoss Extract (Evernia Prunastri)",
    synonyms: [
      "evernia prunastri extract",
      "evernia prunastri",
      "oakmoss extract",
      "oakmoss",
    ],
    category: "fragrance",
    eu26: true,
    severity: 3,
    explanation:
      "Lichen-derived fragrance fixative; a stronger sensitizer in the EU 26 natural-extract pair.",
  },
  {
    key: "treemoss",
    canonical: "Treemoss Extract (Evernia Furfuracea)",
    synonyms: [
      "evernia furfuracea extract",
      "evernia furfuracea",
      "treemoss extract",
      "treemoss",
    ],
    category: "fragrance",
    eu26: true,
    severity: 3,
    explanation:
      "Lichen-derived fragrance fixative; the second of the EU 26 natural-extract pair.",
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
    synonyms: [
      "methylisothiazolinone",
      "methyl isothiazolinone",
      "2-methyl-4-isothiazolin-3-one",
      "2-methyl-2h-isothiazol-3-one",
    ],
    category: "preservative",
    eu26: false,
    severity: 3,
    explanation: "A strong contact sensitizer; restricted in leave-on products in the EU.",
  },
  {
    key: "methylchloroisothiazolinone",
    canonical: "Methylchloroisothiazolinone (MCI)",
    synonyms: [
      "methylchloroisothiazolinone",
      "methylchloro-isothiazolinone",
      "methylchloro isothiazolinone",
      "5-chloro-2-methyl-4-isothiazolin-3-one",
    ],
    category: "preservative",
    eu26: false,
    severity: 3,
    explanation: "Often blended with MI; a known cause of contact dermatitis.",
  },
  {
    key: "benzisothiazolinone",
    canonical: "Benzisothiazolinone (BIT)",
    synonyms: [
      "benzisothiazolinone",
      "1,2-benzisothiazolin-3-one",
      "1,2-benzisothiazol-3(2h)-one",
    ],
    category: "preservative",
    eu26: false,
    severity: 3,
    explanation:
      "A third-generation isothiazolinone preservative; cross-reacts with MI/MCI in many patients.",
  },
  {
    key: "octylisothiazolinone",
    canonical: "Octylisothiazolinone (OIT)",
    synonyms: [
      "octylisothiazolinone",
      "2-octyl-4-isothiazolin-3-one",
      "2-n-octyl-4-isothiazolin-3-one",
    ],
    category: "preservative",
    eu26: false,
    severity: 3,
    explanation:
      "Isothiazolinone preservative used in industrial coatings; sometimes appears in cosmetics.",
  },
  {
    key: "iodopropynyl_butylcarbamate",
    canonical: "Iodopropynyl Butylcarbamate (IPBC)",
    synonyms: [
      "iodopropynyl butylcarbamate",
      "3-iodo-2-propynyl butylcarbamate",
      "ipbc",
    ],
    category: "preservative",
    eu26: false,
    severity: 2,
    explanation:
      "Antifungal preservative; an increasingly common contact-allergy trigger in leave-on products.",
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
      "benzylparaben",
      "pentylparaben",
    ],
    category: "preservative",
    eu26: false,
    severity: 2,
    explanation:
      "Preservative family; some users prefer to avoid the whole class. Iso-/pentyl-/benzyl- variants are banned in EU but appear in older or imported products.",
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
  {
    key: "als",
    canonical: "Ammonium Lauryl Sulfate (ALS)",
    synonyms: ["ammonium lauryl sulfate"],
    category: "sulfate",
    eu26: false,
    severity: 2,
    explanation: "A strong surfactant similar to SLS; common in shampoos and body washes.",
  },
  {
    key: "ales",
    canonical: "Ammonium Laureth Sulfate (ALES)",
    synonyms: ["ammonium laureth sulfate"],
    category: "sulfate",
    eu26: false,
    severity: 1,
    explanation: "Milder counterpart to ALS; the ammonium-salt sibling of SLES.",
  },
  {
    key: "sodium_coco_sulfate",
    canonical: "Sodium Coco Sulfate",
    synonyms: ["sodium coco sulfate", "sodium coco-sulfate"],
    category: "sulfate",
    eu26: false,
    severity: 2,
    explanation:
      "Marketed as a 'natural' alternative but is a coconut-derived blend that contains SLS; expect similar effects.",
  },
  {
    key: "tea_lauryl_sulfate",
    canonical: "TEA-Lauryl Sulfate",
    synonyms: ["tea-lauryl sulfate", "tea lauryl sulfate", "triethanolamine lauryl sulfate"],
    category: "sulfate",
    eu26: false,
    severity: 2,
    explanation: "Triethanolamine-salt sulfate surfactant; similar profile to SLS.",
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
