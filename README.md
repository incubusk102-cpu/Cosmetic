# Cosmetic Allergy Tracker

Your personal allergen radar for cosmetics. Scan a product, get a clear verdict, log reactions over time.

> **Informational only. Not medical advice or a diagnosis. Consult a licensed dermatologist for medical concerns.**

This repo is the MVP scaffold:

- Next.js 14 (App Router) + TypeScript (strict) + Tailwind CSS
- Supabase (Postgres + Auth + Storage) with full row-level security
- Rule-based, explainable ingredient matching (no AI in the matching path)
- Camera-first barcode scanning via [`@zxing/browser`](https://github.com/zxing-js/library)
- Open Beauty Facts lookup with a shared cache table
- Vitest unit tests for the matching engine and OBF client
- GitHub Actions CI: lint + typecheck + test

## Quickstart

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env.local
#   Fill in:
#     NEXT_PUBLIC_SUPABASE_URL
#     NEXT_PUBLIC_SUPABASE_ANON_KEY
#     SUPABASE_SERVICE_ROLE_KEY  (server-only)

# 3. Apply the database migration
#    Either via the Supabase Dashboard SQL editor or the Supabase CLI:
#    supabase db push   (with supabase/migrations/0001_init.sql)

# 4. Run the dev server
npm run dev
```

Then open <http://localhost:3000> and sign in with a magic link.

## Scripts

| Command            | What it does                                |
| ------------------ | ------------------------------------------- |
| `npm run dev`      | Start the Next.js dev server                |
| `npm run build`    | Production build                            |
| `npm run start`    | Start the production server                 |
| `npm run lint`     | ESLint                                      |
| `npm run typecheck`| `tsc --noEmit`                              |
| `npm test`         | Run the Vitest unit suite                   |
| `npm run format`   | Prettier write                              |

## Project shape

```
app/
  (auth)/login          — magic-link sign-in
  (auth)/auth/callback  — completes the OAuth/magic-link exchange
  (app)/scan            — camera-first scanner + manual entry
  (app)/scan/result/[id]— verdict screen
  (app)/products        — saved/recent products
  (app)/reactions       — reaction timeline + create form
  (app)/insights        — counters today; correlations soon
  (app)/settings        — allergens, account
  (app)/onboarding      — first-run allergen picker
components/
  ui/                   — Button, Card, Badge, Chip, VerdictWord
  scan/                 — BarcodeScanner (ZXing wrapper)
lib/
  allergens/            — the curated dictionary (data lives in code, not DB)
  matching/             — pure rule-based engine + tests
  obf/                  — Open Beauty Facts client + tests
  supabase/             — server/client/admin Supabase utilities
supabase/migrations/    — SQL migrations (0001_init.sql defines the 6 tables + RLS)
```

## Design principles (don't break these)

1. **The matching engine is pure.** No I/O, no AI. Deterministic. Testable. See `lib/matching/engine.ts`.
2. **The dictionary lives in code**, not the database. The DB stays small.
3. **The user's history is the moat** — `user_allergens`, `products`, `reactions`.
4. **Never claim "Safe."** The `safe` verdict is rendered as "Clear" with the qualifier
   "No matches in your list."
5. **RLS everywhere.** Every per-user table is policy-protected. The service role key is
   server-only and used only for `product_cache` writes.
6. **No medical claims.** Every verdict shows a disclaimer. No diagnose / treat / cure language.

## License

To be decided.
