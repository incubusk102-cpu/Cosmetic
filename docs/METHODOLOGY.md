# Methodology

> How Cosmetic Allergy Tracker decides what to flag, in plain English. This doc is the public-facing version of the rules; the source of truth in code is `lib/matching/engine.ts` and `lib/insights/correlations.ts`. Both are pure, deterministic, and unit-tested.
>
> If you ever want to know *why* the app showed you Caution, Avoid, or a particular ingredient in the correlations table — this is the file.

---

## The verdict, in three words

When you scan a product, the app shows one of three verdicts:

| Verdict     | Meaning                                                              | What we will *not* say                                       |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Avoid**   | An ingredient on **your** allergen list is in this product.          | "Toxic." "Dangerous." We don't make claims about the product. |
| **Caution** | A close relative — same category as one of your tracked allergens — is in this product. | Anything stronger than "be aware". |
| **Clear**   | No matches in **your** list.                                         | **Never "Safe."** Cosmetic reactions can still happen from anything else. |

That last row is the single most important rule in the codebase. The app will not call a product *safe.* It will tell you that we did not find anything that matches *your* list — that's a very different statement. We render this through a single component (`components/ui/VerdictWord.tsx`) so the wording can never drift.

---

## How matching works

1. **Tokenize the ingredient list.** We split the raw label string (whatever came from the barcode lookup, OCR, or your manual paste) into a list of normalized ingredient tokens. Normalization lowercases, trims, removes punctuation, and collapses common spelling variants. Code: `lib/matching/normalize.ts`.

2. **Check for direct hits.** For each ingredient on your personal allergen list, we look for it (and its known synonyms) in the token list. The dictionary of allergens — including the synonym lists — lives in `lib/allergens/data.ts`, in code, reviewable in a PR. It is **not** AI-generated. It is editorial, and it is the source of any "why".

3. **If any direct hit → Avoid.** We show you which ingredient matched. You can see exactly which synonym hit and why.

4. **Else, check for close relatives.** For each *category* you've tracked (e.g., "fragrance", "preservative", "sulfate"), we look for any other ingredient *in that same category* that wasn't on your list. If we find one, the verdict is **Caution** — same family, possibly cross-reactive.

5. **Else → Clear.** No tracked ingredient and no same-category neighbor matched. The screen reads *"No matches in your list."* (Again: not "Safe.")

The matching function is a pure TypeScript function. No machine learning. No probabilities. Same input → same output, every time. If a verdict ever surprises you, it is reproducible and we can show you exactly which rule fired.

### Custom (free-text) allergens

You can add a custom label that isn't in our dictionary (e.g., "Pearl extract"). For custom labels we do an exact, case-insensitive substring match against the token list. There is no synonym expansion for custom entries — they are matched literally.

### What we do **not** do

- We do not estimate "irritation potential."
- We do not score ingredients on a 1–10 "danger" scale. Those scores in other apps are mostly editorial fictions.
- We do not diagnose. We are an informational product. If you keep reacting, see a licensed dermatologist.
- We do not call any product "Safe."

---

## How the correlations table works (Plus)

The `/insights` page shows a table of ingredients that show up disproportionately in products you've reacted to. The math is intentionally simple — it is **lift**:

```
   lift(ingredient) = P(reaction | product contains ingredient)
                      ─────────────────────────────────────────
                                  P(reaction)
```

- The denominator (baseline) is *your* overall reaction rate across all your scanned products in the last 12 months.
- The numerator is the share of products containing this ingredient that triggered a reaction.
- A lift > 1 means the ingredient appears more often in reacted products than the baseline. A lift of 2× means twice as often, etc.

### Eligibility gates

We do not render the table unless there's enough data to make any meaningful statement. The thresholds are (in code, `lib/insights/correlations.ts`):

| Gate                     | Default | Why                                                                                  |
| ------------------------ | ------- | ------------------------------------------------------------------------------------ |
| `minProducts`            | 3       | Below this, baseline is meaningless.                                                 |
| `minReactedProducts`     | 2       | With one reaction, every ingredient in that single product scores 100% — useless.    |
| `minProductOccurrences`  | 2       | An ingredient that appears in only one product cannot show a pattern.                |

We **deliberately** set these gates loose. A brand-new user with 3 scans and 2 reactions sees *something*. The empty-state copy on `/insights` already tells you what you're missing if the gates aren't met.

### Sort order

Rows are sorted by descending lift. Ties break on `reactedCount` desc, then alphabetically. We cap the displayed list to the top 10 by default.

### Caveats

- **This is a pattern, not a diagnosis.** "Lift 2.5×" means a correlation, not causation. Many cosmetics share the same base ingredients; correlations on those don't tell you anything.
- **One reaction in three products** is a thin signal. We will show it if it passes the gates, but treat it as a hypothesis.
- **Reactions you didn't link to a specific product** don't count toward this table. Linking a reaction to a product (or to a cached barcode you didn't personally scan) is what gives the table data to chew on.

---

## Structural ingredients we filter out

These are ingredients that show up in nearly every cosmetic — flagging them as "correlated with your reactions" is meaningless noise. We exclude them from the correlations table by default. The list lives in code as `STRUCTURAL_FILTER_TOKENS` in `lib/insights/correlations.ts` and is shown on `/insights` as a "How we computed this" footnote.

| Token        | Why we filter it                                                  |
| ------------ | ----------------------------------------------------------------- |
| `aqua`       | "Water" in INCI nomenclature. In virtually every formulation.     |
| `water`      | Same as aqua, the English label.                                  |
| `eau`        | Same as aqua, the French label.                                   |
| `parfum`     | The bulk fragrance umbrella ingredient — not a single chemical.   |
| `fragrance`  | English label for the same. (You can still track individual EU 26 fragrance allergens — those bypass this filter.) |
| `mica`       | Common mineral filler / shimmer; non-specific. |
| `ci 77891`   | Titanium dioxide (white pigment). In everything pigmented.        |
| `ci 77491`   | Iron oxide (red).                                                 |
| `ci 77492`   | Iron oxide (yellow).                                              |
| `ci 77499`   | Iron oxide (black).                                               |
| `ci 77019`   | Mica-based colorant.                                              |

**Why this list is conservative.** Each entry is something that shows up almost everywhere. Filtering it out makes the table show *meaningful* signal, not noise. If we filtered too aggressively — e.g., excluding common emollients like glycerin — we would hide real correlations. The list is intentionally small and editorial.

**This filter does NOT affect the verdict screen.** If you track water as a personal allergen (some people are sensitive to mineral content), the matching engine still flags it. The filter only applies to the *correlations* table.

---

## Privacy

The matching runs **client-side or server-side, but never on a third-party server.** The OCR step runs entirely in your browser via `tesseract.js`. The matching function is invoked from a server action that has access to your row only — RLS is on for every per-user table. The verdict is computed against *your* allergen list; another user with the same product gets a different verdict.

We do not share, sell, or rent your scan history, reaction log, or allergen list. Ever. This is the brand. See `docs/PLAN.md` §7 and §9.

---

## When this document is updated

This file describes the rules in production. If you find a discrepancy between what the app does and what this document says, **the app is the truth** — file an issue and we'll update the document. If you find a rule that you disagree with, file an issue or open a PR against `docs/METHODOLOGY.md` and the relevant code. Both are versioned together so the explanation can never lie about the code.

*Last updated: see git blame.*
