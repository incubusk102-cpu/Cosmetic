# Cosmetic Allergy Tracker — Founder-Level Plan

> The 13-section plan the project was originally briefed against. Grounded in what actually shipped (see `docs/TASKS.md` for the build ledger and the README for the stack). This is the strategy document, not a sales deck — written for the team, not for investors.

---

## 1. Executive summary

**The product.** A precision tool for one job: tell me whether a cosmetic I'm holding will give me a reaction, and remember what already did. Camera-first scan, rule-based ingredient match against the user's personal allergen list, reaction log, dermatologist-grade PDF export.

**The wedge.** Most "ingredient checker" apps are content-led (blog + affiliate). They show every ingredient as scary. We show one verdict — Avoid / Caution / Clear — tied to *this user's* history. That's the entire UX.

**Why now.**
- EU 26 fragrance allergens are mandatory disclosure; the data is sitting in Open Beauty Facts already.
- Smartphones now have good enough cameras and on-device OCR (Tesseract.js) to skip server-side image processing.
- Supabase + Postgres + Next.js means a one-person team can run this for years without an ops budget.
- People with chronic skin conditions check ingredients many times a week, every week, for life. That's retention nobody has to manufacture.

**The moat.** Not the dictionary. Not the AI. The moat is **the user's own reaction history** — once they've logged six months of products and flare-ups, the correlations engine is more useful to them than any competitor's database, and they cannot get that back by switching apps.

**State of the build.** MVP scaffold + post-MVP feature wave + activation/monetization follow-ups all shipped (PRs #1–#12). Stripe Plus is live behind a webhook. Correlations work. Dermatologist PDF works. Termux/phone-only runbook works. The next wave is onboarding polish, methodology transparency, and a real growth motion — not new features.

**Where the risk is.** Trust. We are one bad "Safe" verdict from a regulator email. The product never says "Safe" — it says "No matches in your list." That single editorial decision is the most important thing in the codebase. See §12.

---

## 2. Strategy

**Founder-level take, no hedging:**

1. **Be a tool, not a community.** Communities are a tar pit for one-founder products. The user doesn't need a forum to figure out whether benzyl salicylate is in their lotion. Resist every PM instinct to add comments, feeds, "discover," and recommendations. The interface should feel closer to a calculator than to Instagram.

2. **Sell the export, not the scan.** The free tier scans forever. The Plus tier sells the export — the PDF a user hands to a dermatologist, the correlations table that makes the dermatologist's job 10 minutes shorter. People will pay $5/mo to walk into an appointment with a printout, not to scan a barcode. That's already how `app/api/export/pdf/route.ts` is gated (`pdf_exports_used_this_month`, 1/mo free, unlimited Plus).

3. **Keep the database small on purpose.** The allergen dictionary lives in `lib/allergens/data.ts`, not Postgres. The product cache (`product_cache`) stores Open Beauty Facts lookups, not user content. Six tables total (`profiles`, `user_allergens`, `products`, `reactions`, `product_cache`, `scan_events`). Every additional table is one more thing to migrate, one more RLS policy to audit, one more index to keep tuned. **Refuse to grow this number** until a feature literally cannot ship without it.

4. **The matching engine is pure.** `lib/matching/engine.ts` has zero I/O, zero AI, zero randomness. It's a function. It's deterministic. It's exhaustively unit-tested. This is the audit-defense posture: if a regulator or a dermatologist ever asks "why did your app say Caution for this product?", we can show them the rule, the synonym list, and the trace. You cannot do that with an LLM and you should not try.

5. **Trust over completeness.** A small, curated allergen list with confident verdicts beats a huge list with sloppy ones. The MVP ships with EU 26 fragrance allergens plus a representative subset of the common dermatology suspects (formaldehyde releasers, MI/MCI, lanolin, parabens, etc.). Adding allergens is an editorial process, not a scraping job.

6. **Distribution = chronic-care channels, not ads.**
   - Dermatologist clinics: hand out a one-pager telling patients to scan their existing products before the next appointment. The PDF is the leave-behind. They do the marketing for us because it saves them time.
   - Eczema / rosacea / contact-dermatitis subreddits and Discords. Linkable explanations of *why* we flagged an ingredient (because the dictionary is public, in code) build credibility you cannot fake with ads.
   - Pharmacy aisles, eventually. Not now.

7. **Don't claim medical authority.** Every verdict screen carries the disclaimer. The marketing landing page says it. The PDF footer says it. The README enshrines it as a design principle. We are an **informational** product. Crossing into "diagnosis" gets us classified as a medical device in the EU, the UK, and the US — that's a different company.

---

## 3. MVP

The MVP is already shipped. Listing it here as the spec of what "v1 done" means, so we don't accidentally re-scope it:

**Must-have (shipped, v1):**
- Email magic-link auth (Supabase Auth).
- Onboarding: pick allergens from the dictionary or add custom ones.
- Camera-first barcode scan (`@zxing/browser`) → Open Beauty Facts lookup → cache → verdict.
- Verdict screen: Avoid / Caution / Clear with the matched ingredient names visible. Never the word "Safe".
- Saved products list, recent scans.
- Reaction log with severity, body area, symptoms, free-text notes.
- Settings: edit allergens, delete account, sign out.
- Full RLS on every per-user table.
- CI: lint, typecheck, tests, build with placeholder Supabase env vars.

**Must-have (shipped, v2 post-MVP):**
- OCR fallback when barcode is missing or unrecognized (`tesseract.js`, on-device, no upload to a third party).
- Manual ingredient entry as the final fallback.
- Dermatologist-handoff PDF export, last 12 months (`pdf-lib`).
- Stripe Plus: Checkout + Customer Portal + webhook.
- Reaction ↔ ingredient correlations on `/insights` (Plus).
- Sub-cancel on account deletion (so we don't keep billing deleted users).
- Cached-product picker for orphan reactions (so correlations have data on day one).

**Must-have (shipped, v3/v4):**
- Loosened correlation gates (3 products / 2 reacted / 2 occurrences) so the engine produces signal during early dogfood.
- Marketing landing page at `/` for anon visitors (and a self-contained `landing/index.html` mirror for offline / Termux preview).
- Termux runbook for previewing the landing and running the full app from an Android phone.

**Explicitly not in MVP — and we should keep it that way:**
- Social features (sharing, comments, public profiles).
- Routine-builder / shelf manager. (Maybe v6+.)
- AI ingredient explanations. (See §12 — risk.)
- Native mobile apps. PWA is enough; the camera works on iOS Safari and Android Chrome.
- Multi-language support beyond English. Pick markets first.
- B2B dashboards for dermatology clinics. Not until we have ≥5 clinics asking for it.

---

## 4. Architecture

```
                   ┌──────────────────────────────────────────────────┐
                   │  Browser (PWA, camera, OCR all on-device)        │
                   │                                                  │
                   │   ZXing barcode  ─┐                              │
                   │   Tesseract OCR  ─┼─► matching/engine (pure fn) │
                   │   Manual entry   ─┘            │                 │
                   └────────────────────────────────┼─────────────────┘
                                                    │ Server Actions
                                                    ▼
                   ┌──────────────────────────────────────────────────┐
                   │  Next.js 14 (App Router) on Vercel / Cloudflare  │
                   │                                                  │
                   │  • Server Actions for writes                     │
                   │  • Route Handlers for Stripe webhook + PDF       │
                   │  • Middleware for auth gating                    │
                   │  • Supabase server client (RLS preserved)        │
                   └────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────────────┐
        │  Supabase (Postgres + Auth + Storage)                     │
        │                                                           │
        │  • RLS on every per-user table                            │
        │  • Service-role used only for product_cache writes        │
        │  • 6 tables total                                         │
        └───────────────────────────────────────────────────────────┘

        ┌──────────────┐       ┌──────────────┐
        │  Open Beauty │       │   Stripe     │
        │   Facts API  │       │  (Checkout + │
        │  (cached)    │       │   Portal +   │
        │              │       │   Webhook)   │
        └──────────────┘       └──────────────┘
```

**Stack — opinionated, chosen for low ops, not for resume value:**

| Layer            | Choice                                          | Why this, not the alternative                                                                                                |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Framework        | Next.js 14 App Router + TypeScript strict       | Server actions kill ~80% of the API surface. We don't need REST.                                                             |
| Styling          | Tailwind                                        | One file, no design-system overhead. Premium look comes from typography + restraint, not from a UI kit.                      |
| Backend          | Supabase (Postgres + Auth + Storage)            | Auth, RLS, storage in one. We don't run any server we have to patch.                                                         |
| Barcode          | `@zxing/browser`                                | Runs in the browser. No server upload, no privacy issue.                                                                     |
| OCR              | `tesseract.js`                                  | On-device. The cosmetics back-label use case is small enough to fit Tesseract's accuracy envelope.                           |
| Matching         | Pure TS in `lib/matching/`                      | No ML. Explainable. Auditable. Diff-able.                                                                                    |
| PDF              | `pdf-lib`                                       | No headless Chrome, no Puppeteer. Renders on a serverless function in <2s.                                                   |
| Billing          | Stripe Checkout + Customer Portal               | We do not write a billing UI. Stripe owns the renewal, the dunning, the tax, the receipts.                                   |
| Hosting          | Vercel (default) or Cloudflare Pages            | Both fit inside free/$20 tiers for a long time.                                                                              |
| Tests            | Vitest                                          | Engine + OCR text-cleaner + correlations + Stripe event reducer + PDF quota — all pure functions, easy to test exhaustively. |
| CI               | GitHub Actions                                  | lint + typecheck + test + build on every push.                                                                               |

**Things we deliberately don't have, with reasons:**
- No Redis. We don't need a cache layer; the `product_cache` table is the cache.
- No queue / worker. Webhook is idempotent and synchronous. PDF generation is synchronous. There is no background work that can't fit in a request lifecycle.
- No analytics SDK. We use server-side scan-event rows in `scan_events` for product analytics. No third-party tracker on the client.
- No feature flags service. We branch on `plan = 'plus'` and that's it.

---

## 5. Database schema

Six tables. Every per-user table is RLS'd to `auth.uid()`. Migrations live in `supabase/migrations/`.

```sql
-- profiles: one row per auth user, plus the billing & quota state.
profiles (
  id                              uuid    PK → auth.users(id) on delete cascade,
  display_name                    text,
  plan                            text    not null default 'free' check (in 'free','plus'),
  pdf_exports_used_this_month     int     not null default 0,
  pdf_exports_period              text    not null default to_char(now() at time zone 'utc','YYYY-MM'),
  region                          text    default 'EU',
  stripe_customer_id              text    unique where not null,
  stripe_subscription_id          text,
  plan_renews_at                  timestamptz,
  created_at                      timestamptz not null default now()
)

-- user_allergens: the moat. Either a dictionary key or a custom label, or both.
user_allergens (
  id            uuid PK,
  user_id       uuid not null → auth.users(id) on delete cascade,
  allergen_key  text,                -- references lib/allergens/data.ts at the application layer
  custom_label  text,
  severity      smallint not null default 2 check (between 1 and 3),
  created_at    timestamptz not null default now(),
  unique (user_id, coalesce(allergen_key,''), coalesce(custom_label,''))
)

-- products: every product the user has scanned, plus the latest cached verdict.
products (
  id               uuid PK,
  user_id          uuid not null → auth.users(id) on delete cascade,
  barcode          text,
  brand            text,
  name             text,
  source           text not null check (in 'barcode','ocr','manual'),
  ingredients_raw  text,
  scanned_at       timestamptz not null default now(),
  is_saved         boolean not null default false,
  last_verdict     text check (in 'safe','caution','avoid'),
  index (user_id, scanned_at desc),
  index (user_id, barcode) where barcode is not null
)

-- reactions: what happened when the user used a product (or no product).
reactions (
  id            uuid PK,
  user_id       uuid not null → auth.users(id) on delete cascade,
  product_id    uuid → products(id) on delete set null,
  severity      smallint not null check (between 0 and 4),
  body_area     text,
  symptoms      text[],
  notes         text,
  photo_path    text,                -- Supabase Storage, user-scoped bucket
  occurred_at   timestamptz not null default now(),
  index (user_id, occurred_at desc)
)

-- product_cache: shared cache of barcode lookups. No user data. Service-role writes only.
product_cache (
  barcode          text PK,
  brand            text,
  name             text,
  ingredients_raw  text,
  fetched_at       timestamptz not null default now(),
  source           text not null default 'openbeautyfacts'
)

-- scan_events: short-retention event log for matching-path debugging.
scan_events (
  id          bigserial PK,
  user_id     uuid → auth.users(id) on delete cascade,
  kind        text not null check (in 'barcode_hit','barcode_miss','ocr_used','manual_used','match_run'),
  meta        jsonb,
  created_at  timestamptz not null default now()
)
```

**RLS posture:**

| Table           | Policy                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| `profiles`      | `auth.uid() = id` for read+write                                          |
| `user_allergens`| `auth.uid() = user_id` for read+write                                     |
| `products`      | `auth.uid() = user_id` for read+write                                     |
| `reactions`     | `auth.uid() = user_id` for read+write                                     |
| `scan_events`   | `auth.uid() = user_id` for read+write                                     |
| `product_cache` | `select` for any authenticated user; **no insert/update/delete policy** — service role only |

The allergen dictionary is **not** in the database. It lives in `lib/allergens/data.ts` and gets shipped in the bundle. This means: schema migrations don't need to touch reference data, the dictionary is diff-reviewable in PRs, and `user_allergens.allergen_key` is a referential string the application validates — not a foreign key. **Don't move it into the DB.** It would buy you nothing and cost you a migration tax forever.

---

## 6. User flow

### 6.1 First-run

1. Landing (`/` for anon) → "Try it now" → magic-link sign-in.
2. Onboarding (`/onboarding`): pick from the curated allergen categories (Fragrance — EU 26, Preservatives, Lanolin, Sulfates, etc.) or add a custom label. Severity is set to "moderate" by default. The user picks 1–3 to start; we explicitly warn that adding too many causes false-Caution fatigue.
3. Drop into `/scan` with a clear "Point at any barcode" hint and the camera open.

### 6.2 Steady state — scan flow

```
        ┌─────────────────────────────┐
        │   /scan   (camera open)     │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴───────────────────────────┐
        │ Barcode detected? (ZXing in browser)     │
        └────────┬──────────────────────────┬──────┘
                 │ YES                      │ NO
                 ▼                          ▼
        ┌────────────────────┐    ┌──────────────────────┐
        │ Hit product_cache  │    │ Offer OCR upload     │
        │ first → fallback   │    │ (in-browser tess)    │
        │ to OBF API + cache │    └──────────┬───────────┘
        └────────┬───────────┘               │
                 │                           │
                 │                           ▼
                 │                ┌──────────────────────┐
                 │                │ Manual paste / type  │
                 │                └──────────┬───────────┘
                 │                           │
                 ▼                           ▼
        ┌─────────────────────────────────────────┐
        │  matchIngredients(ingredients_raw,      │
        │                   user_allergens)       │
        │  → { verdict, directMatches[],          │
        │      relativeMatches[], tokens[] }      │
        └──────────────────┬──────────────────────┘
                           ▼
        ┌─────────────────────────────────────────┐
        │  /scan/result/[id]                      │
        │                                         │
        │   AVOID    — N tracked allergens hit   │
        │   CAUTION  — same-category neighbors    │
        │   CLEAR    — "No matches in your list"  │
        │                                         │
        │   [ Save ]  [ Log a reaction ]          │
        └─────────────────────────────────────────┘
```

**Hard rules baked into the flow:**
- The result screen always lists the matched ingredient names with the dictionary entry's explanation. No black-box "Avoid" without a reason.
- The "Clear" state never says "Safe." Copy is *"No matches in your list. Cosmetic reactions can still happen — log any reaction here."*
- A "log a reaction" CTA is on the result screen, the products list, and the reaction list — three places it can be reached in one tap from anywhere in the app.

### 6.3 Reaction log + insights

- `/reactions` lists reactions chronologically. Each row has an `AttachProductRow` so a user can attach a reaction to one of *their* products or any product in `product_cache` (the orphan-reaction case).
- `/insights` shows daily counters always, and Plus users see the reaction ↔ ingredient correlations table (`computeCorrelations()`, thresholds `minProducts=3 / minReactedProducts=2 / minProductOccurrences=2`).
- `/api/export/pdf` generates the dermatologist-handoff PDF. Free tier: 1/month, period stored in `pdf_exports_period`, auto-resets. Plus tier: unlimited.

---

## 7. Feature tiers

### Free — always

- Unlimited scans (barcode / OCR / manual).
- Verdict screen + matched ingredient explanation.
- Personal allergen list, custom allergens.
- Save products, list recent scans.
- Reaction log + counters.
- 1 PDF export per month.
- Full data export (CSV) on account deletion. **Always.** Don't gate this.

### Plus — $4.99/mo or $39/yr (target prices; ship at the lower bound)

- Reaction ↔ ingredient correlations on `/insights`.
- Unlimited PDF exports with the correlations table embedded.
- Up to 10 photo attachments per reaction (Supabase Storage, user-scoped bucket).
- Priority email support, 24-hour reply SLA from a real human (= the founder, on a phone).

### What we do NOT charge for, on principle

- Reading a product's verdict. This is a safety tool. Paywalling the answer makes the brand toxic.
- Editing your allergen list. Adding/removing your own data is not a premium feature.
- Account deletion + data export. Free, always, one click.

### What we will *never* sell to third parties

- User reaction data, scan history, allergen lists, photos. Not in aggregate, not anonymized, not "research partnerships." This is the brand. Write it in the privacy policy and never break it.

---

## 8. UI/UX direction

**Mood:** clinical, calm, premium. Closer to Stripe Atlas or Linear than to Sephora. The product is a precision tool, so the interface should look like one.

**Principles:**

1. **One verdict, one number, one CTA per screen.** No dashboards. No "discover." If the user can't tell in 0.5 seconds what to do next, the screen is wrong.
2. **Camera-first.** The `/scan` route opens the camera immediately. No "Enable camera?" dialog. No tutorial overlay on subsequent visits.
3. **Verdict colour grammar:**
   - **Avoid** — high-contrast red (`#B91C1C` on white), bold, full-width.
   - **Caution** — amber (`#B45309`), with the qualifier "same-category match".
   - **Clear** — calm green-gray (`#0F766E`-ish), with the disclaimer *"No matches in your list"* underneath in muted text.
4. **Type before colour.** Headlines are big and confident (e.g., `2xl` to `4xl`, semibold). Body text is `15px–16px` at a comfortable line height (1.5). Numbers (matched count, reaction severity) use a tabular-figures variant.
5. **Subtle motion only.** Fade-in on verdict reveal (~150ms). Spinner during OBF lookup with the literal product name appearing letter-by-letter as it returns. **No bouncing chips, no confetti, ever.** This is health-adjacent; whimsy is wrong.
6. **Empty / loading / success / error / warning states are first-class.** Every list page renders all 5 states. Empty states have one specific CTA (not "Get Started"); error states have a one-line plain-English explanation plus a retry button.
7. **One-handed thumb reach.** Primary CTAs anchor to the bottom of the viewport on mobile. The scan FAB is bottom-right. Settings live behind a header chevron, not a hamburger.
8. **Accessibility is not a roadmap item, it ships now.** Min target size 44×44px. WCAG AA contrast on every verdict colour. Screen-reader labels on the verdict (matched allergens read aloud). The barcode scanner has a "use the photo OCR instead" path for users who can't keep a camera steady.
9. **No marketing in the app.** No "Upgrade to Plus!" banner on the scan screen. The single Plus upsell lives on `/insights` (where the value is real) and `/settings`. That's it.
10. **Premium without ornament.** Use whitespace, not gradients. One accent colour (verdict-driven). Lucide icons at a single stroke weight. The landing page mirror (`landing/index.html`) is the visual reference — it should match the app.

**Component shape (in `components/ui/`):**
- `<Button>` — three variants (primary, secondary, ghost). One size by default.
- `<Card>` — flat, 1px border, subtle shadow only on hover.
- `<Badge>` / `<Chip>` — for allergen tags. Solid for tracked, outlined for relatives.
- `<VerdictWord>` — the single most important component. Renders the colour + word + qualifier as a system. **Never inline the verdict styling.**

---

## 9. Security and privacy

**This is a health-adjacent app handling sensitive personal data. Treat it that way from day one.**

- **RLS on every per-user table.** Already done. The CI build runs against placeholder Supabase env so we never accidentally test against real data.
- **Service-role key is server-only.** It is never bundled. Its only use is `product_cache` writes (a non-personal table) and the Stripe webhook handler. If a future PR introduces a second use, it gets reviewed twice.
- **No third-party trackers.** No Google Analytics, no Mixpanel, no PostHog session replay. We use server-side `scan_events` for the few product analytics we need.
- **OCR is on-device.** `tesseract.js` runs in the browser. Ingredient photos are not uploaded to a third-party OCR service. Ever.
- **Reaction photos** (Plus) go to a Supabase Storage bucket with user-scoped RLS. Bucket policy: `auth.uid() = path's first segment`. Photos are deleted on `account_delete`.
- **Magic-link auth only.** No password, no OAuth surfaces. Fewer attack vectors, no password reset flow.
- **Stripe webhook verification.** The webhook handler verifies the signature with `STRIPE_WEBHOOK_SECRET`. The webhook is idempotent — re-delivering the same event yields the same DB state. See `lib/stripe/events.ts` tests.
- **Account deletion = data deletion.** When a user deletes their account, we:
  1. Cancel the Stripe subscription if one exists (already implemented, PR #7).
  2. Delete the `auth.users` row, which cascades to `profiles`, `user_allergens`, `products`, `reactions`, `scan_events`.
  3. Sweep Storage objects under `userId/*`.
  No "soft delete." No "30-day grace period." Gone is gone.
- **Disclaimer everywhere.** The README enshrines "no medical claims." The verdict screen has the disclaimer. The PDF footer has the disclaimer. The marketing page has the disclaimer. The privacy policy will have the disclaimer.
- **Privacy policy + ToS shipped before any paid signup.** Both link from the landing footer and the account page. Both name a real data-protection contact (the founder's email, at minimum).
- **GDPR posture.** EU users get the standard rights (access, rectification, erasure, portability). Erasure = account deletion above. Portability = a CSV export of `products` + `reactions` + `user_allergens`. We don't transfer data out of the EU if hosted there (Supabase EU region).

---

## 10. Monetization

**Pricing.** $4.99/mo or $39/yr (≈ $3.25/mo annualized, a 35% discount, the standard SaaS y/m ratio). Free tier is permanent and useful. **Do not raise prices until you have ≥10k paid users**; price experimentation kills trust at this scale.

**Why this is enough.**
- Solo founder, low ops. Vercel + Supabase + Stripe runs at <$200/mo until ~5k MAU on the free tier.
- 1,000 Plus subs at $4.99 = $4,990/mo ≈ a credible solo income.
- 10,000 Plus subs = a hireable second engineer.
- The product never has to be a unicorn. It has to be a **good business at a small scale**, then a good business at a slightly larger scale.

**Conversion mechanic.**
- The free PDF export quota (1/month, `pdf_exports_used_this_month` + `pdf_exports_period`) is the conversion trigger. A user hitting the wall right before their dermatologist appointment will upgrade. The upsell on `/insights` ("Unlock correlations and unlimited exports") is the secondary trigger.
- **No dark patterns.** No "cancel" buried 4 clicks deep — the Stripe Customer Portal handles cancellation in one click. People who churn out and come back later are worth more than people who churn out angry.

**What we don't do.**
- **No ads.** This is a health-adjacent app. Ads break trust irreversibly.
- **No affiliate links to cosmetic brands.** Same reason.
- **No "Pro" / "Enterprise" tier yet.** We can add a clinics SKU later, but only when there are clinics asking.
- **No selling user data.** Already covered in §7. Worth repeating.

**Refund policy.** Pro-rated refund on request within 14 days, no questions asked. Stripe handles the math.

---

## 11. Roadmap

### v1 — MVP scaffold ✅ shipped
Auth, scan, verdict, products, reactions, settings, CI.

### v2 — post-MVP feature wave ✅ shipped
OCR fallback, dermatologist PDF, Stripe Plus, correlations.

### v3 — activation + monetization follow-ups ✅ shipped
Cache picker on new-reaction + existing-reaction flows. Loosened correlation gates. PDF embeds correlations. Sub-cancel on account deletion.

### v4 — front door + mobile workflow 🟡 mostly shipped
Marketing landing page (`#9`). Termux runbook (`#9`). Root-level static-preview redirect (`#12`). Open: onboarding audit (P2), structural-ingredients footnote on `/insights` (P2).

### v5 — trust & growth (next, ~4–6 weeks)
- **Onboarding audit & polish.** Re-walk the first-run flow end-to-end. Hard cap on initial allergen picks (~5) to prevent false-Caution fatigue. Add a 30-second "how matching works" page that's actually 30 seconds.
- **Methodology transparency.** Footnote near the correlations table: "We filter out water, glycerin, and other structural ingredients before computing correlations." Link to a `docs/METHODOLOGY.md` we publish on the marketing site.
- **Allergen dictionary v2.** Expand from EU 26 + common suspects to: full list of CIR-flagged ingredients, sulfates expanded, parabens family complete, MI/MCI synonyms tightened. Editorial review with a real dermatologist (consult).
- **First 100 users program.** Manual outreach. Eczema / rosacea / contact-dermatitis communities. Free Plus for 6 months in exchange for a written reaction history.

### v6 — clinical handshake (~2–3 months)
- **Dermatologist landing page** at `/for-clinicians`. Patient-facing one-pager PDF the clinic can print and hand out.
- **Multi-user export.** "Show this code to your dermatologist" — a one-time, expiring read-only link to your reaction log + PDF. (Doctor never gets a login, never gets the user's data permanently.)
- **iCloud / Google Drive backup** (optional, user-initiated). One-button JSON export to the user's own storage.

### v7 — scale-readiness (~6 months)
- **Multi-region Supabase.** EU & US instances. Region recorded in `profiles.region`; data residency honored.
- **Public allergen-dictionary contribution.** PRs against `lib/allergens/data.ts` accepted from dermatologists with credentials. Editorial review still gated.
- **Affiliate-free product recommendations.** "Products in your saved list that are likely Clear for *your* allergens" — engagement, not monetization.

### v8 and beyond — only if traction is real
- Localized dictionaries (JP, KR — heavy cosmetic use, strong skincare communities).
- Routine-builder (multi-product daily routine, what's compatible).
- Native iOS app (Capacitor or Expo). Only if PWA hits a wall, which it has not.

**Anti-roadmap — what NOT to build, no matter who asks:**
- A social feed of "products my friends scanned." This is not a social product.
- AI-generated ingredient explanations. The current explanations are editorial and trustworthy; LLMs will make them sound smart and be wrong.
- "Scan your face" or any computer-vision feature analyzing the user's skin. Out of scope, regulatory risk, fragile UX.
- A B2B SaaS for cosmetic brands. Different company. Don't blur it.

---

## 12. Risks and fixes

| #  | Risk                                                                                                                                            | Likelihood | Impact | Mitigation                                                                                                                                                                          |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | A user has a serious reaction to a product we marked "Clear" and we are blamed.                                                                 | Medium     | Severe | We never say "Safe." Disclaimer on every verdict, in the PDF, in the privacy policy. **Liability insurance** before we hit 1k paid users.                                           |
| 2  | A regulator (FTC, EU consumer agency) classifies us as a medical device.                                                                        | Low–Medium | Severe | No diagnosis language. No treatment claims. The product describes ingredients, not conditions. Marketing copy reviewed quarterly.                                                   |
| 3  | Open Beauty Facts has an inaccurate ingredient list for a product.                                                                              | Medium     | Medium | OCR fallback + manual entry exist for exactly this. We surface "data from Open Beauty Facts" on the verdict screen so the user knows the upstream source.                           |
| 4  | A user adds an extremely common ingredient (e.g., "fragrance") to their allergen list and gets Caution on everything → "this app is broken."    | High       | Medium | Onboarding warns. Settings explains. Empty / partial states on `/insights` ask the user to refine.                                                                                  |
| 5  | The barcode scanner doesn't work on iOS Safari < some version.                                                                                  | Medium     | Medium | Always offer the OCR upload + manual entry path on `/scan`. Don't hide them behind a "having trouble?" link — surface them.                                                         |
| 6  | The matching engine misses a synonym (e.g., "Kathon CG" for methylisothiazolinone) → false "Clear".                                             | Medium     | High   | Synonyms are reviewable in `lib/allergens/data.ts`. Editorial process. Add a "report an ingredient" link from any verdict screen → opens a prefilled GitHub issue.                   |
| 7  | The matching engine over-matches (e.g., flagging "salicylic acid" because the user listed "willow bark extract") → "Caution fatigue" → churn.   | Medium     | High   | The "relative" match path is conservative by design — only same-category neighbors of *tracked* allergens. Aggressively unit-tested.                                                |
| 8  | Stripe webhook delivery fails or duplicates.                                                                                                    | Medium     | Medium | Handler is idempotent on `event.id`. `events.test.ts` covers the duplicate + replay case. Use Stripe's exponential retry — don't write our own queue.                               |
| 9  | A user's photo of an ingredient list is uploaded somewhere we don't control (e.g., browser upload to OCR API).                                  | Low        | Severe | `tesseract.js` runs in-browser. **Never** add a server-side OCR path without a privacy-policy update + a banner on the upload UI.                                                   |
| 10 | An employee (= the founder) accidentally pushes the `SUPABASE_SERVICE_ROLE_KEY` to a client bundle.                                             | Low        | Severe | The key is referenced only from `lib/supabase/admin.ts` which imports `server-only`. CI builds with a placeholder. The real key lives in Vercel/Cloudflare env, never in the repo.  |
| 11 | The single founder gets hit by a bus / quits / burns out.                                                                                       | Real       | Severe | The repo is well-documented. `docs/TASKS.md` is the source of truth for state. `README.md` reproduces the install on a fresh box. The matching engine is pure & tested.             |
| 12 | OBF API rate-limits or goes down.                                                                                                               | Low        | Medium | `product_cache` absorbs the load. Manual + OCR work without OBF.                                                                                                                    |
| 13 | A bad actor tries to harvest the allergen dictionary or the cached product DB.                                                                  | Low        | Low    | The dictionary is open-source in the repo (and a strength, not a leak). `product_cache` is read-only to authenticated users and contains no personal data.                          |

**Two risks worth restating because they're the ones that kill the company:**

> **Never say "Safe."** This is the #1 editorial rule. It is enforced in code (`VerdictWord` renders "Clear" for the `safe` verdict) and in the README's design principles.
>
> **Never claim diagnosis.** This is the #1 marketing rule. "Cosmetic Allergy *Tracker*" — not "Cosmetic Allergy *Diagnoser*". Track, not treat.

---

## 13. Final recommendation

**Ship the v5 trust-and-growth wave next.** The product is feature-complete enough to be useful. What it isn't is *known*. Three concrete actions, in order:

1. **Onboarding audit & polish (1 week).** Cap initial allergen picks at 5. Add a 30-second "how matching works" page. Make the first scan happen within 90 seconds of signup, measured.

2. **First 100 users program (4 weeks).** Direct outreach to eczema / rosacea / contact-dermatitis communities. Free Plus for 6 months in exchange for one written reaction-history paragraph. Use those paragraphs as the testimonials on the landing page. Don't run paid ads until the landing converts ≥3% organically.

3. **Dermatologist outreach (parallel, 4 weeks).** Cold-email 50 dermatology clinics. The pitch is one sentence: *"Your patients come in unable to remember which products caused their flare-up. Hand them this one-page PDF in the lobby."* The PDF the patient fills out before the appointment is the leave-behind. Zero ask of the clinic except handing out a paper.

**Don't:**
- Don't rewrite the stack. It's correctly sized for this product.
- Don't add features. The MVP is complete; what's missing is **users**, not code.
- Don't redesign the verdict screen. It works. The instinct to "modernize" it is wrong.
- Don't take VC money for this. The economics work at $5k/mo. They get worse, not better, with a board.

**One sentence to write on the wall:**

> *"A precision tool for people whose skin is already telling them something. We make it legible."*

---

*Last updated: see git blame. This document is meant to be revised — when reality and the plan disagree, update the plan. Don't pretend.*
