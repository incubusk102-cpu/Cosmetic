# Cosmetic Allergy Tracker — Full-Stack Build Spec

> Companion to `docs/PLAN.md`. **PLAN.md** is the strategy (the *why* and *what*). **STACK.md** is the engineering blueprint (the *how*) — the doc you read to build, ship, deploy, debug, or onboard.
>
> Read order: `README.md` (run it) → `docs/PLAN.md` (understand why) → this file (build it) → `docs/TASKS.md` (state of the build).

---

## 0. Goal → file map (the bridge from PLAN.md to code)

Use this table to find the modules that satisfy each strategic goal. If a goal has no module, it's a roadmap item, not shipped yet.

| PLAN.md goal                                                                     | Code that satisfies it                                                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Camera-first scan, barcode-first                                                 | `app/(app)/scan/page.tsx`, `app/(app)/scan/ScanWorkspace.tsx`, `components/scan/`            |
| OCR fallback (on-device)                                                         | `lib/ocr/cleanText.ts`, `tesseract.js` invoked client-side from `ScanWorkspace.tsx`          |
| Manual entry fallback                                                            | `ScanWorkspace.tsx` manual-paste mode + `app/(app)/scan/actions.ts`                          |
| Open Beauty Facts lookup + cache                                                 | `lib/obf/client.ts`, `product_cache` table, service-role write in `lib/products/`            |
| Rule-based, explainable matching                                                 | `lib/matching/engine.ts`, `lib/matching/normalize.ts`, `lib/allergens/data.ts`               |
| Verdict UI (never the word "Safe")                                               | `components/ui/VerdictWord.tsx`, `app/(app)/scan/result/[id]/page.tsx`                       |
| Personal allergen list = the moat                                                | `user_allergens` table, `app/(app)/settings/allergens/`, `app/(app)/onboarding/`             |
| Reaction log                                                                     | `reactions` table, `app/(app)/reactions/`, `app/(app)/reactions/new/`                        |
| Reaction ↔ ingredient correlations (Plus)                                        | `lib/insights/correlations.ts`, `app/(app)/insights/page.tsx`                                |
| Dermatologist-handoff PDF                                                        | `lib/pdf/report.ts`, `app/api/export/pdf/route.ts`, `lib/pdf/quota.ts`                       |
| Free PDF quota = 1/month, Plus = unlimited                                       | `lib/pdf/quota.ts`, `profiles.pdf_exports_used_this_month` + `pdf_exports_period`            |
| Stripe Plus (Checkout + Portal + Webhook)                                        | `lib/stripe/`, `app/api/stripe/checkout/`, `app/api/stripe/portal/`, `app/api/stripe/webhook/` |
| Cancel sub on account deletion                                                   | `app/(app)/settings/account/actions.ts` → `cancelSubscriptionIfAny`                          |
| Full RLS                                                                         | `supabase/migrations/0001_init.sql` (the `enable row level security` + policy block)         |
| Auth gating                                                                      | `middleware.ts`, `lib/supabase/server.ts` (`getCurrentUser`)                                 |
| Marketing landing page (anon)                                                    | `app/page.tsx`, `landing/index.html` (offline mirror), root `index.html` (Termux redirect)   |
| Phone-only dev workflow                                                          | `docs/TERMUX.md`                                                                             |
| State of the build                                                               | `docs/TASKS.md`                                                                              |

If a row says "shipped" in PLAN.md but maps to nothing here, that's a bug — file a TASKS.md entry.

---

## 1. Stack and version pinning

| Layer            | Pinned version            | Why this version                                                                          |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| Node             | `>=20.0.0` (CI: 20)       | LTS, supported through 2026. Don't bump to 22 until Vercel's default does.                |
| Next.js          | `14.2.15`                 | App Router, server actions stable. **No 15 until** server-actions / cache APIs settle.    |
| React            | `^18.3.1`                 | RSC + server actions. Stay on 18 until Next 15.                                           |
| TypeScript       | `^5.6.3`                  | Strict mode on. `noUncheckedIndexedAccess` is on (see `tsconfig.json`).                   |
| Tailwind         | `^3.4.13`                 | v4 isn't a clear win yet. Hold.                                                           |
| `@supabase/ssr`  | `0.5.2`                   | The only Supabase client we use for cookie-based session. Don't mix `auth-helpers`.       |
| `@supabase/supabase-js` | `2.45.4`           | Service-role admin client only.                                                            |
| `@zxing/browser` | `^0.1.5`                  | Browser-only barcode entrypoint over `@zxing/library`.                                    |
| `tesseract.js`   | `5.1.1`                   | On-device OCR. v5 fixed the WASM-in-Next bundling issue.                                  |
| `pdf-lib`        | `1.17.1`                  | Pure JS PDF. No headless Chrome.                                                          |
| `stripe`         | `17.7.0`                  | API version pinned in `lib/stripe/client.ts`. Don't bump without re-reading the changelog.|
| `zod`            | `^3.23.8`                 | Schema validation for server-action inputs.                                               |
| `lucide-react`   | `^0.452.0`                | Icon set. Single stroke weight (see PLAN.md §8).                                          |
| `vitest`         | `^2.1.2`                  | Test runner.                                                                              |
| ESLint           | `^8.57.1` + Next config   | TypeScript strict + Next rules.                                                           |
| Prettier         | `^3.3.3` + tailwind plugin| Format-on-save. CI does NOT fail on format; lint does.                                    |

**Anti-stack** (what we deliberately don't use):
- No Redis / Memcached. `product_cache` is the cache.
- No background workers / cron infra. Quota period is computed in app code (`pdf_exports_period`). Stripe handles retries.
- No headless Chrome / Puppeteer. PDF is rendered by `pdf-lib`.
- No client-side analytics SDK. We rely on `scan_events` rows.
- No CSS-in-JS runtime. Tailwind + `tailwind-merge` + `clsx` (`lib/cn.ts`).
- No state library (Zustand, Redux, Jotai). Server actions + form `useFormState` + URL state.

---

## 2. Repository layout

```
.
├── app/                          Next.js App Router
│   ├── layout.tsx                Root layout (font, <html>, global CSS)
│   ├── page.tsx                  Marketing landing (anon)
│   ├── globals.css               Tailwind directives + tokens
│   ├── (auth)/                   Public group: login + magic-link callback
│   │   ├── login/
│   │   │   ├── page.tsx          Email input
│   │   │   ├── LoginForm.tsx     Client form, useFormState
│   │   │   └── actions.ts        signInWithMagicLink(email)
│   │   └── auth/callback/
│   │       └── route.ts          Exchange the OAuth code for a session
│   ├── (app)/                    Authed group; layout enforces user
│   │   ├── layout.tsx            Calls requireUser(); renders nav shell
│   │   ├── scan/
│   │   │   ├── page.tsx          SSR — fetches user_allergens
│   │   │   ├── ScanWorkspace.tsx CSR — camera, OCR, manual
│   │   │   ├── actions.ts        upsertScannedProduct(...)
│   │   │   └── result/[id]/
│   │   │       ├── page.tsx      Verdict screen
│   │   │       ├── SaveToggle.tsx Toggle products.is_saved
│   │   │       └── actions.ts    toggleSave, logReactionFromResult
│   │   ├── products/page.tsx     Saved + recent
│   │   ├── reactions/
│   │   │   ├── page.tsx          Timeline
│   │   │   ├── AttachProductRow.tsx  Personal + cached picker
│   │   │   ├── actions.ts        Attach / detach / delete
│   │   │   └── new/
│   │   │       ├── page.tsx
│   │   │       ├── NewReactionForm.tsx
│   │   │       └── actions.ts    createReaction(...)
│   │   ├── insights/page.tsx     Counters + (Plus) correlations
│   │   ├── settings/
│   │   │   ├── page.tsx          Index
│   │   │   ├── allergens/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── AllergenManager.tsx
│   │   │   │   └── actions.ts
│   │   │   └── account/
│   │   │       ├── page.tsx
│   │   │       ├── AccountActions.tsx   Delete / export
│   │   │       ├── StripeButtons.tsx    Upgrade / portal
│   │   │       └── actions.ts           deleteAccount, requestCheckoutUrl
│   │   └── onboarding/
│   │       ├── page.tsx
│   │       ├── OnboardingForm.tsx
│   │       └── actions.ts        saveInitialAllergens
│   └── api/                      Route handlers (only when actions won't fit)
│       ├── export/pdf/route.ts   PDF binary; quota-gated
│       └── stripe/
│           ├── checkout/route.ts
│           ├── portal/route.ts
│           └── webhook/route.ts  Idempotent on event.id
│
├── components/
│   ├── ui/                       Button, Card, Badge, Chip, VerdictWord
│   ├── scan/                     ZXing wrapper (BarcodeScanner)
│   └── landing/                  Landing page sections (anon route)
│
├── lib/
│   ├── cn.ts                     clsx + tailwind-merge
│   ├── supabase/
│   │   ├── env.ts                Reads + asserts public env
│   │   ├── client.ts             Browser client (createBrowserClient)
│   │   ├── server.ts             Server client (createServerClient + cookies)
│   │   ├── admin.ts              "server-only" service-role (cache writes, deletion)
│   │   └── database.types.ts     Hand-written DB types; replace with generated later
│   ├── allergens/
│   │   ├── types.ts              AllergenEntry type
│   │   └── data.ts               THE dictionary (read-only)
│   ├── matching/
│   │   ├── normalize.ts          Tokenize ingredient string
│   │   ├── engine.ts             Pure matchIngredients(...)
│   │   └── engine.test.ts        Exhaustive cases
│   ├── ocr/
│   │   ├── cleanText.ts          Regex pipeline for OCR garbage
│   │   └── cleanText.test.ts
│   ├── obf/
│   │   ├── client.ts             fetchFromOpenBeautyFacts(barcode)
│   │   └── client.test.ts
│   ├── products/
│   │   ├── searchQuery.ts        Build trgm search SQL safely
│   │   ├── searchQuery.test.ts
│   │   └── importFromCache.ts    Copy a product_cache row into a user's products
│   ├── insights/
│   │   ├── correlations.ts       computeCorrelations(reactions, products)
│   │   └── correlations.test.ts
│   ├── pdf/
│   │   ├── quota.ts              checkAndIncrementPdfQuota(profile, plan)
│   │   ├── quota.test.ts
│   │   ├── report.ts             buildPdf(...)
│   │   └── report.test.ts
│   └── stripe/
│       ├── client.ts             Lazy Stripe instance + env helpers
│       ├── events.ts             reduceStripeEvent(...) → DB intent
│       └── events.test.ts        Replay/idempotency cases
│
├── supabase/migrations/
│   ├── 0001_init.sql             6 tables + RLS + trigger
│   ├── 0002_pdf_export_quota.sql Period tracking column
│   └── 0003_stripe_columns.sql   Stripe IDs + renewal timestamp
│
├── docs/
│   ├── PLAN.md                   Strategy (this PR)
│   ├── STACK.md                  This file
│   ├── TASKS.md                  Build ledger
│   └── TERMUX.md                 Phone-only dev workflow
│
├── landing/index.html            Self-contained offline mirror of the landing
├── index.html                    Root redirect → landing/ (for Termux Path A)
├── middleware.ts                 Auth gate
├── next.config.mjs               Minimal
├── tailwind.config.ts            Tokens + content paths
├── postcss.config.mjs
├── tsconfig.json                 strict, noUncheckedIndexedAccess, paths "@/*"
├── vitest.config.ts
├── .eslintrc.json                next/core-web-vitals + tseslint
├── .prettierrc.json              + prettier-plugin-tailwindcss
├── .env.example                  Public env names only; values are blanks
└── .github/workflows/ci.yml      lint + typecheck + test + build
```

---

## 3. Authentication

**Mechanism:** magic-link email only. Supabase Auth handles delivery and the code-exchange handshake.

**Flow (file paths):**

```
   Browser              Next.js                   Supabase
     │                     │                          │
  /login type email ──►  app/(auth)/login/actions.ts
                           signInWithMagicLink ───►  Auth (signInWithOtp)
                           returns "check inbox"
     │  click email link ─────────────────────────►  /auth/callback?code=...
                           app/(auth)/auth/callback/
                              route.ts
                              exchangeCodeForSession ──► Auth
                           sets cookies via @supabase/ssr
     │  302 → /scan        │                          │
   /scan request ──►     middleware.ts
                           reads cookies, getUser()
                           if no user → 302 /login
                           if user → forward
                           app/(app)/layout.tsx
                              requireUser() (server)
                              renders shell
```

**Server vs client client:**

| Use case                          | Import                                  |
| --------------------------------- | --------------------------------------- |
| Server components                 | `lib/supabase/server.ts` → `getSupabaseServerClient()` |
| Server actions / route handlers   | Same as above                           |
| Browser components (rarely)       | `lib/supabase/client.ts` → `getSupabaseBrowserClient()` |
| Privileged ops (cache writes, account deletion sweep) | `lib/supabase/admin.ts` → `getSupabaseAdminClient()` (this file `import "server-only"`) |

**Rules:**
- Never import `lib/supabase/admin.ts` from a client component. The `server-only` import will refuse to compile if you try.
- `getCurrentUser()` is the cheap way to gate a server component. For actions, do `const supabase = getSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw …`.
- `middleware.ts` PUBLIC_PATHS = `["/login", "/auth/callback", "/about", "/privacy"]`. Anything else without a user redirects to `/login?next=<path>`. Root `/` is also allowed unauthenticated (landing).

---

## 4. Database

### 4.1 Tables

See PLAN.md §5 for the schema; SQL of record is `supabase/migrations/0001_init.sql` (+ 0002, 0003).

| Table           | Purpose                                                              | Rows per user (rough) |
| --------------- | -------------------------------------------------------------------- | --------------------- |
| `profiles`      | Per-user state: plan, quota, Stripe IDs                              | 1                     |
| `user_allergens`| Tracked allergens (dictionary key or custom label)                   | 1–10                  |
| `products`      | Every product the user has scanned                                   | 5–100s                |
| `reactions`     | Logged reactions, optionally linked to a product                     | 0–100s                |
| `product_cache` | Shared OBF cache (no user data)                                      | grows globally        |
| `scan_events`   | Short-retention event log for matching-path debugging                | bursty; prune monthly |

### 4.2 RLS policies (copy-paste reference)

```sql
alter table public.profiles       enable row level security;
alter table public.user_allergens enable row level security;
alter table public.products       enable row level security;
alter table public.reactions      enable row level security;
alter table public.scan_events    enable row level security;
alter table public.product_cache  enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own allergens" on public.user_allergens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own products" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own reactions" on public.reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own scan events" on public.scan_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- read-only to any authenticated user; writes are service-role only.
create policy "read cache" on public.product_cache
  for select to authenticated using (true);
```

**Audit rule:** any new per-user table you add **must** ship its `alter table … enable row level security` and its policy in the same migration. There is no "we'll add policies later." Future-you will not add policies later.

### 4.3 Indexes (the hot paths)

```sql
create index products_user_scanned_at_idx on products (user_id, scanned_at desc);
create index products_user_barcode_idx    on products (user_id, barcode) where barcode is not null;
create index reactions_user_occurred_at_idx on reactions (user_id, occurred_at desc);
create unique index user_allergens_user_key_custom_uidx
  on user_allergens (user_id, coalesce(allergen_key,''), coalesce(custom_label,''));
create unique index profiles_stripe_customer_id_key
  on profiles (stripe_customer_id) where stripe_customer_id is not null;
```

### 4.4 Database setup checklist (a fresh Supabase project)

1. Create a Supabase project. Pick the **EU region** unless you have a reason not to.
2. Open the SQL editor.
3. Paste `0001_init.sql`. Run. (Or `supabase db push` if you've paired the CLI.)
4. Paste `0002_pdf_export_quota.sql`. Run.
5. Paste `0003_stripe_columns.sql`. Run.
6. Verify in the Auth panel: providers → Email is on, "Confirm email" is OFF (magic link), "Secure email change" is ON.
7. In Project Settings → API: copy `URL`, `anon` key, `service_role` key into Vercel/Cloudflare env (see §10).
8. (Plus tier) Settings → Storage: create a private bucket `reaction-photos` with policy `auth.uid()::text = (storage.foldername(name))[1]`. This is not yet shipped — it's the v5 photo-attachment item.

---

## 5. The matching engine

This is the most important pure function in the codebase. Read `lib/matching/engine.ts` in full before changing anything; the tests are exhaustive on purpose.

**Contract:**

```ts
matchIngredients(
  rawIngredients: string,                  // raw, possibly noisy, multi-line text
  userAllergens: ReadonlyArray<{
    allergen_key: string | null;            // dictionary key OR null+custom_label
    custom_label?: string | null;
  }>
): {
  verdict: "safe" | "caution" | "avoid";
  directMatches: MatchedAllergen[];
  relativeMatches: MatchedAllergen[];
  tokens: string[];
}
```

**Rules:**
1. Any direct hit on a tracked allergen → `avoid`.
2. Else, any same-category neighbor of a tracked allergen → `caution`.
3. Else → `safe` (the UI renders this as "Clear" + the qualifier "No matches in your list").

**Property invariants the tests enforce:**
- Output is deterministic. Same input → same output, always.
- No I/O, no network, no DB, no `Date.now()`.
- Empty allergen list → `safe`.
- Custom user labels are matched as case-insensitive substrings on a single token.
- Synonyms are de-duped; no double-count on the same dictionary entry.

**Adding an allergen** (editorial flow):
1. Edit `lib/allergens/data.ts`. Add the entry. **Don't rename existing `key` values** — they're persisted in `user_allergens.allergen_key`.
2. Add a regression test case in `engine.test.ts` that fails before your change and passes after.
3. If the new entry shares a category with existing entries, run the test suite — the "caution" cases may change behavior for old fixtures.
4. PR. Update PLAN.md §11 if the addition is part of a numbered wave.

---

## 6. The scan flow as a state machine

`/scan` is a single page that walks the user through one of three input paths. The state machine lives in `ScanWorkspace.tsx` (client) and ends with a server-action call that creates a `products` row and routes to `/scan/result/[id]`.

```
                       ┌─────────────────┐
                       │   idle (camera) │
                       └────────┬────────┘
                                │ ZXing detects a code
                                ▼
                       ┌─────────────────┐
                       │   barcode_hit   │
                       └────────┬────────┘
                                │ server action: lookup barcode
                                │   1) read product_cache
                                │   2) miss → OBF.fetch
                                │   3) hit  → insert product_cache (admin)
                                ▼
                       ┌─────────────────┐
                       │   matching      │ ── pure matchIngredients(...)
                       └────────┬────────┘
                                │ insert into products
                                ▼
                       ┌─────────────────┐
                       │  /scan/result/  │
                       └─────────────────┘
                                ▲
                  ┌─────────────┴──────────────┐
                  │                            │
            ocr_picked                  manual_entered
                  ▲                            ▲
                  │                            │
        (tess.recognize → cleanText)    (textarea submit)
                  │                            │
                  └───┐                  ┌─────┘
                      │                  │
                ┌─────┴──────────────────┴─────┐
                │   user dismisses scanner      │
                └───────────────────────────────┘
```

**Server actions involved (file → function):**
- `app/(app)/scan/actions.ts` → `upsertScannedProduct({ barcode?, brand?, name?, ingredients_raw, source })` returns `productId`.
- `app/(app)/scan/result/[id]/actions.ts` → `toggleSave(productId, save: boolean)` and `logReactionFromResult(productId, ...)`.

**Cache write rule:** only `lib/obf/client.ts`'s fetcher upserts into `product_cache`, and it does so via the admin client. Never write to `product_cache` from a regular server action — the RLS policy is read-only.

---

## 7. Server actions and route handlers — the API surface

### 7.1 Server actions (preferred for writes)

| Path                                       | Function(s)                                   | Validates with         |
| ------------------------------------------ | --------------------------------------------- | ---------------------- |
| `app/(auth)/login/actions.ts`              | `signInWithMagicLink(email)`                   | `zod` email schema     |
| `app/(app)/onboarding/actions.ts`          | `saveInitialAllergens(selections, customLabels)` | zod                  |
| `app/(app)/scan/actions.ts`                | `upsertScannedProduct(...)`                    | zod                    |
| `app/(app)/scan/result/[id]/actions.ts`    | `toggleSave`, `logReactionFromResult`          | zod                    |
| `app/(app)/reactions/new/actions.ts`       | `createReaction(...)`                          | zod                    |
| `app/(app)/reactions/actions.ts`           | `attachProductToReaction`, `detachProduct`, `deleteReaction` | zod      |
| `app/(app)/settings/allergens/actions.ts`  | `addAllergen`, `removeAllergen`, `updateSeverity` | zod                |
| `app/(app)/settings/account/actions.ts`    | `deleteAccount`, `requestCheckoutUrl`, `requestPortalUrl` | zod          |

**Server-action conventions:**
- First line: `"use server";`
- Always re-fetch user via `getSupabaseServerClient()` + `getUser()`. Never trust an `id` passed in from the client.
- Validate inputs with zod. Return a typed `{ ok: true } | { ok: false, error: string }` for forms using `useFormState`.
- Revalidate the relevant path (`revalidatePath("/products")`) after a mutation so the next render is fresh.

### 7.2 Route handlers (only when actions don't fit)

| Path                                | Why a route handler, not an action          |
| ----------------------------------- | -------------------------------------------- |
| `app/api/export/pdf/route.ts`       | Returns a binary PDF response                |
| `app/api/stripe/checkout/route.ts`  | Returns a 303 redirect to Stripe             |
| `app/api/stripe/portal/route.ts`    | Returns a 303 redirect to Stripe             |
| `app/api/stripe/webhook/route.ts`   | Receives raw POST from Stripe with signature verification |

---

## 8. Stripe billing flow

```
   User on /settings/account
        │
        ▼
   StripeButtons.tsx → server action requestCheckoutUrl()
        │
        ▼
   /api/stripe/checkout
        │  stripe.checkout.sessions.create({mode:'subscription', success_url, cancel_url, customer? })
        ▼
   redirect → checkout.stripe.com
        │
        ▼   (user pays)
   Stripe → POST /api/stripe/webhook
        │  verify signature with STRIPE_WEBHOOK_SECRET
        │  reduceStripeEvent(evt) → DB intent
        │    - checkout.session.completed  → profiles.plan='plus', set stripe_customer_id
        │    - customer.subscription.updated  → set stripe_subscription_id, plan_renews_at
        │    - customer.subscription.deleted  → profiles.plan='free', null out sub_id
        ▼  ack 200 (idempotent on evt.id)
   profiles row reflects current plan
        │
        ▼
   Plus-gated UI on /insights, /api/export/pdf, etc. checks profile.plan='plus'
```

**Idempotency:** the webhook handler dedupes on `event.id`. `lib/stripe/events.test.ts` covers double delivery and out-of-order delivery.

**Cancellation:** users hit Customer Portal via `requestPortalUrl()` → `stripe.billingPortal.sessions.create({ customer })`. Stripe's portal handles the cancel UX; our webhook reflects the result in `profiles`.

**Account deletion** (`actions.ts → deleteAccount`):
1. If `profiles.stripe_subscription_id` is set, call `stripe.subscriptions.cancel(subId)` (immediate, prorated).
2. Delete `auth.users` row → cascades all per-user tables.
3. Best-effort sweep of Storage objects under `userId/*`.

---

## 9. PDF export and quota

**Endpoint:** `GET /api/export/pdf` → `Content-Type: application/pdf`.

**Quota math** (`lib/pdf/quota.ts`):
```
currentPeriod = to_char(utc now, 'YYYY-MM')

if profile.pdf_exports_period != currentPeriod:
    reset counter to 0, set period = currentPeriod

if plan == 'free' and counter >= 1:        return 402 with "free quota exhausted"
if plan == 'free' and counter < 1:         counter += 1; allow
if plan == 'plus':                         allow (no increment)
```

**Render pipeline** (`lib/pdf/report.ts`):
1. Load reactions in the last 12 months for this user.
2. Load products joined to those reactions.
3. Compute correlations (Plus only — `lib/insights/correlations.ts`).
4. Compose pages with `pdf-lib`: cover, methodology footer, reaction timeline, (Plus) correlations table, disclaimer.
5. Return bytes.

**Rules:**
- The PDF footer carries the same disclaimer text as the verdict screens.
- The user's name/email are not embedded if the user has not set a `display_name` (we don't surface auth.users.email in the PDF without opt-in).
- File name: `cosmetic-allergy-tracker-{user-id-short}-{YYYY-MM}.pdf`.

---

## 10. Environment variables

**Inventory** (everything `process.env.*` referenced from app/lib/middleware):

| Variable                              | Scope             | Required for       | Notes                                                                                  |
| ------------------------------------- | ----------------- | ------------------ | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | public            | All                | From Supabase dashboard                                                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | public            | All                | From Supabase dashboard                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`           | **server-only**   | OBF cache writes, account deletion sweep, webhooks | Never bundled. `lib/supabase/admin.ts` imports `server-only`. |
| `STRIPE_SECRET_KEY`                   | server-only       | Plus tier          | `sk_live_…` in prod, `sk_test_…` in dev                                                |
| `STRIPE_WEBHOOK_SECRET`               | server-only       | Plus tier          | From Stripe Dashboard → Developers → Webhooks                                          |
| `STRIPE_PRICE_MONTHLY_ID`             | server-only       | Plus monthly       | `price_…`                                                                              |
| `STRIPE_PRICE_YEARLY_ID`              | server-only       | Plus yearly (opt.) | `price_…`                                                                              |
| `NEXT_PUBLIC_APP_URL`                 | public            | Stripe redirect URLs | `https://yourdomain.com` in prod, `http://localhost:3000` in dev                     |
| `OPEN_BEAUTY_FACTS_USER_AGENT`        | server-only (opt) | Polite OBF        | OBF asks every client to identify itself. Default is shipped; override with your email |

**Local dev:** `cp .env.example .env.local`, fill in the Supabase + (optional) Stripe values.

**CI:** `.github/workflows/ci.yml` uses **placeholder** Supabase values for `npm run build` — the build must not crash without real credentials. Don't break that.

**Production:** set all vars in your Vercel/Cloudflare project env. Make sure the Stripe webhook endpoint in Stripe Dashboard points at `https://yourdomain.com/api/stripe/webhook`.

---

## 11. Deployment

### 11.1 Vercel (recommended path)

1. Push the repo. Connect on vercel.com.
2. Framework auto-detected (Next.js). Build command: `npm run build`. Output: `.next`.
3. Add env vars from §10. Use Vercel's "Sensitive" flag for everything that's not `NEXT_PUBLIC_*`.
4. Set the Production branch to `main` (or whichever default branch you ship to).
5. After first deploy: open Stripe Dashboard, register the webhook URL, copy the signing secret into `STRIPE_WEBHOOK_SECRET`, redeploy.

### 11.2 Cloudflare Pages (alternate)

1. Use the Next.js adapter (`@cloudflare/next-on-pages`).
2. Build command: `npx @cloudflare/next-on-pages@1`.
3. Output: `.vercel/output/static`.
4. Same env vars. Note: route handlers run on Cloudflare Workers — confirm `app/api/stripe/webhook/route.ts` body parsing is compatible (it reads raw body for signature verification).

### 11.3 Pre-flight checklist (every prod deploy)

- [ ] `npm run lint` clean
- [ ] `npm run typecheck` clean
- [ ] `npm test` green (83+ tests)
- [ ] `npm run build` with placeholder env succeeds
- [ ] No `.env.local` accidentally committed
- [ ] Stripe webhook signing secret matches the dashboard
- [ ] Supabase RLS is on for every per-user table (`select tablename, rowsecurity from pg_tables where schemaname='public';`)
- [ ] `docs/TASKS.md` updated for any shipping work

---

## 12. Testing

**Stack:** Vitest. Co-located `*.test.ts` next to the unit.

**What's tested today** (8 files, 83 tests):
- `lib/matching/engine.test.ts` — matching rules, custom labels, relative matches, synonyms.
- `lib/insights/correlations.test.ts` — gates, sort order, lift math.
- `lib/ocr/cleanText.test.ts` — OCR regex pipeline.
- `lib/obf/client.test.ts` — OBF response parsing.
- `lib/pdf/report.test.ts` — PDF section composition (snapshot-style).
- `lib/pdf/quota.test.ts` — period reset, monthly counter, plan branching.
- `lib/stripe/events.test.ts` — event reducer, idempotency, replay.
- `lib/products/searchQuery.test.ts` — search query builder safety.

**What's NOT tested** (intentionally, or as known gaps):
- React components. We don't ship a component test runner. Add one only if a UI bug recurs.
- Server actions end-to-end. Tested through the pure functions they call. Add Playwright later, only when the test surface justifies the maintenance cost.
- Supabase. Not mocked. Pure functions only on the test side.

**How to add a test:**
1. Co-locate the test next to the unit. Use `.test.ts`, not `.spec.ts`.
2. Pure functions only. If you reach for a mock, your function is impure — refactor.
3. Cover the *named* invariant in PLAN.md if there is one (e.g., "never says Safe", "quota resets on month boundary").
4. Run `npm test` locally before pushing.

---

## 13. Conventions and house style

- **TypeScript strict + `noUncheckedIndexedAccess`.** If you reach for `any`, `as unknown as X`, or `// @ts-ignore`, fix the type instead.
- **Server-first.** Default to a Server Component. Reach for `"use client"` only for camera / OCR / Stripe redirect handlers / interactive forms.
- **One CTA per screen.** Surface the next obvious action; bury everything else under a chevron.
- **Verdict copy is non-negotiable.** Never the word "Safe." Render via `<VerdictWord>`; never inline the colour.
- **Disclaimer on every verdict and every PDF.** "Informational only. Not medical advice or a diagnosis. Consult a licensed dermatologist for medical concerns."
- **Imports at top of files only.** No nested imports inside functions.
- **Comments are rare.** Name things well. Don't comment the diff.
- **TASKS.md updated in the same PR** that ships the work. The convention from PR #8 (`docs(tasks): link PR #N against …`): each new PR converts the previous entry's `[~] + (this PR)` placeholder into `[x] + (#N)`.
- **Branches:** `devin/<unix-ts>-<kebab-summary>`. The default branch is `devin/1779212353-mvp-scaffold`, not `main`.

---

## 14. How to extend safely (recipes)

### 14.1 Add a new tracked allergen
1. Edit `lib/allergens/data.ts` (the dictionary).
2. Add a regression test in `lib/matching/engine.test.ts`.
3. `npm test`.
4. Update PLAN.md §3 if it's part of a numbered wave.

### 14.2 Add a new per-user table
1. New migration file `supabase/migrations/000N_<topic>.sql`.
2. Include the `enable row level security` + an `auth.uid() = user_id` policy in the same file.
3. Regenerate `lib/supabase/database.types.ts` (or hand-edit it for now).
4. Add a server action that reads/writes; never the admin client.
5. Add an index for the hot query.

### 14.3 Add a Plus-gated feature
1. Read `profile.plan` server-side. Don't trust the client.
2. UI: render a single, calm upsell — not a banner. See `/insights` for the pattern.
3. If you add a quota, mirror `pdf_exports_*` columns + the period-reset logic in `lib/pdf/quota.ts`.

### 14.4 Change the matching engine
1. **Don't, unless you have a failing test case.**
2. Add the failing test first. Watch it fail. Make it pass. Confirm no other test regressed.
3. If you change the verdict grammar (the three buckets), update PLAN.md §6 in the same PR.

### 14.5 Add a Stripe event handler
1. Update `lib/stripe/events.ts` `reduceStripeEvent(...)` switch.
2. Add a test in `events.test.ts` with both a single delivery and a replay of the same `event.id`.
3. Confirm the webhook still returns 200 for unknown events (forward-compatibility).

---

## 15. Phone-only development

See `docs/TERMUX.md` for the full runbook. Short version:

- **Just preview the landing:** `pkg install python git; git clone …/Cosmetic; cd Cosmetic; python -m http.server 8765` (root redirect handles the case where you forget to `cd landing`).
- **Run the full app:** `pkg install nodejs-lts git; git clone …; cd Cosmetic; npm install; cp .env.example .env.local` (fill in), then `npm run dev -- -H 0.0.0.0`.

Termux Wake-lock (`termux-wake-lock`) is required for long sessions; Android will otherwise kill the Node process.

---

## 16. Continuity and document hygiene (read this first if you're a future session)

This codebase is worked on by a rotating cast of agent sessions across days, weeks, and quota windows. Institutional memory lives in **three documents and only three documents**. If you erase, replace, or rewrite them, you destroy the only handoff layer this project has.

**The three preserved documents:**

| File             | Role                                            | How to change it                                                                                                                                                          |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PLAN.md`   | Strategy: the 13-section founder-level plan.    | **Amend** sections in place. Never delete a section. Add new content under existing sections. Keep section numbering 1–13 even if a section becomes shorter or longer.    |
| `docs/STACK.md`  | This file. Engineering blueprint.               | **Amend** sections in place. Add new sections at the end. Update the goal-map (§0) and stack-pinning (§1) whenever code reality shifts.                                   |
| `docs/TASKS.md`  | Build ledger. State of the build, one line each.| **Append-only for shipped work.** Flip `[ ]`/`[~]` → `[x]` with PR link. Cancelled tasks become `[!] dropped — <reason>`. **Never delete a shipped entry.** History is the point. |

**Hard rules — non-negotiable:**

1. **Never erase the strategy.** No PR may delete or wholesale-replace `docs/PLAN.md` or `docs/STACK.md`. Disagree with them? **Amend** them in the same PR that ships the disagreement. Leave a paper trail.
2. **Never delete shipped entries from `docs/TASKS.md`.** The ledger is the project's resume. Cancelled work gets marked `[!] dropped`, never removed.
3. **Every PR that ships work updates `docs/TASKS.md` in the same PR.** The convention from PR #8 — each new PR converts the previous entry's `[~] + (this PR)` placeholder into `[x] + (#N)` once the merge number is known.
4. **"Remaining work" lives in the repo, not in chat.** Before pushing, if there are open follow-ups, write them into `docs/TASKS.md` under the right wave. Don't rely on chat memory — it will be summarized away.
5. **Run order on every fresh session:** `git log --oneline -20` → `docs/TASKS.md` → `docs/PLAN.md` → this file → start work. Five minutes of reading prevents a day of rewriting what already exists.

**Why this matters:** the previous Devin session ran out of quota mid-housekeeping. Two PRs (`#11`, `#12`) shipped without flipping the ledger. Without these documents in place, the next session would have re-implemented features that already exist. Don't be that session.

---

## 17. What this doc is *not*

- **Not a tutorial.** If you don't know Next.js App Router or Supabase RLS, read those docs first; then come back here for the project-specific rules.
- **Not a roadmap.** Roadmap lives in `docs/PLAN.md` §11 and `docs/TASKS.md`.
- **Not the strategy.** If you're trying to decide *whether* to build something, read `docs/PLAN.md`. This file tells you *how* once you've decided.

---

*Last updated: see git blame. When reality and the spec disagree, update the spec.*
