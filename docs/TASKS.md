# Tasks

Single source of truth for what's shipped vs what's left. **Every PR that lands or queues new work must update this file.** Keep entries short — one line of context plus a PR link is enough.

Conventions:

- `[x]` shipped (merged), `[ ]` open, `[~]` in flight, `[!]` blocked / needs decision
- Group by "handoff" wave (v1 = MVP scaffold, v2 = post-MVP, v3 = activation/monetization). New waves get a new heading.
- Inside a wave, group by priority: **P0** (must-ship) → **P1** (should-ship) → **P2** (nice-to-have).
- Link the PR (`#NN`) when shipped. Link the issue or the PR comment that announced it when it's still open.

---

## v1 — MVP scaffold

- [x] Next.js + TS + Tailwind scaffold, allergen dictionary, rule-based matching engine
- [x] Full MVP: auth, scan, verdict, products, reactions, settings, CI

## v2 — post-MVP feature wave

- [x] **P0** OCR fallback via on-device Tesseract.js ([#1](https://github.com/incubusk102-cpu/Cosmetic/pull/1))
- [x] **P0** Dermatologist-handoff PDF export, last 12 months ([#2](https://github.com/incubusk102-cpu/Cosmetic/pull/2))
- [x] **P0** Stripe Plus: Checkout + Customer Portal + webhook ([#3](https://github.com/incubusk102-cpu/Cosmetic/pull/3))
- [x] **P0** Reaction ↔ ingredient correlations on `/insights` (Plus) ([#4](https://github.com/incubusk102-cpu/Cosmetic/pull/4))

## v3 — activation + monetization follow-ups

### P0 (must-ship)

- [x] **#1** Expose the shared `product_cache` from the new-reaction flow so users can attach to products they haven't personally scanned. Imports the cached product into the user's `products` table on first pick. ([#8](https://github.com/incubusk102-cpu/Cosmetic/pull/8); deferred from [#5](https://github.com/incubusk102-cpu/Cosmetic/pull/5))
- [ ] **#2** [intentionally blank — slot reserved if a third P0 surfaces. Update this entry or delete it once the v3 handoff doc is recovered.]
- [x] **#3** Loosen `computeCorrelations()` eligibility gates for early/dogfood data. Shipped defaults: `minProducts=3`, `minReactedProducts=2`, `minProductOccurrences=2` (was `5 / 2 / 3`). `/insights` empty-state copy updated to match. ([#10](https://github.com/incubusk102-cpu/Cosmetic/pull/10); deferred from [#6](https://github.com/incubusk102-cpu/Cosmetic/pull/6))

### P1 (should-ship)

- [x] Attach an existing reaction to one of the user's products from the `/reactions` list, so the correlations engine has data ([#5](https://github.com/incubusk102-cpu/Cosmetic/pull/5))
- [x] Pipe correlations into the Plus-tier PDF export ([#6](https://github.com/incubusk102-cpu/Cosmetic/pull/6))
- [x] Cancel the user's Stripe subscription when they delete their account ([#7](https://github.com/incubusk102-cpu/Cosmetic/pull/7))
- [x] Extend the `AttachProductRow` on `/reactions` to search the global `product_cache` (parallel to v3 P0 #1 but for the existing-reaction case). Collapsed by default; auto-expands when the user has zero personal products. Reuses `importUserProductFromCache` so the verdict is recomputed against the user's allergens. ([#11](https://github.com/incubusk102-cpu/Cosmetic/pull/11))

## v4 — front door + mobile workflow

### P0 (must-ship)

- [x] Marketing landing page at `/` for anon visitors (replaces the bare redirect-to-login). Self-contained `landing/index.html` mirror for offline / Termux preview. ([#9](https://github.com/incubusk102-cpu/Cosmetic/pull/9))
- [x] `docs/TERMUX.md` runbook for previewing the landing and running the full app from an Android phone via Termux. ([#9](https://github.com/incubusk102-cpu/Cosmetic/pull/9))

### P1 (should-ship)

- [x] Root-level `index.html` that redirects to `landing/` so `python -m http.server` from the repo root still shows the marketing page on Termux Path A (avoids the bare directory listing when the `cd landing` step is missed). TERMUX.md updated to mention the fallback. ([#12](https://github.com/incubusk102-cpu/Cosmetic/pull/12))

### P2 (nice-to-have)

- [ ] First-class onboarding for the allergen list (the `app/(app)/onboarding/` page exists; audit the flow end-to-end and tighten the empty / partial states).
- [ ] Surface a "structural ingredients we filter out" footnote near the correlations table so the methodology is transparent.

## v5 — trust & growth (per `docs/PLAN.md` §11)

> The strategy doc ([`docs/PLAN.md`](./PLAN.md)) is authoritative. Every entry here is a concrete task derived from it; keep both in sync.

### P0 (must-ship)

- [x] Onboarding audit & polish: cap initial allergen picks at 5 to avoid false-Caution fatigue (PLAN §12 risk #4), add a 30-second "how matching works" intro, ensure first scan happens within 90 seconds of signup. (#15)
- [x] Methodology transparency: render a footnote near the correlations table on `/insights` listing the structural ingredients we filter (water, glycerin, etc.). Link to `docs/METHODOLOGY.md`. (#15)
- [x] Publish `docs/METHODOLOGY.md` describing the matching rules (verdict grammar, direct vs relative, synonym handling) in plain English. Linked from the marketing site footer. (#15)

### P1 (should-ship)

- [~] Allergen dictionary v2: expand `lib/allergens/data.ts` to cover full EU 26 + the next tier of common suspects (formaldehyde releasers complete, parabens family complete, sulfates expanded, MI/MCI synonyms tightened). Editorial review with a dermatologist consult. (this PR — dermatologist sign-off still pending; promote to [x] after review)
- [x] "Report an ingredient" link on every verdict screen → prefilled GitHub issue (PLAN §12 risk #6 mitigation). Link rendered on `/scan/result/[id]` under the disclaimer; pure helper at `lib/report/issueUrl.ts` with 17 co-located Vitest cases. ([#17](https://github.com/incubusk102-cpu/Cosmetic/pull/17))
- [ ] Photo attachments on reactions (Plus only): create `reaction-photos` Supabase Storage bucket, user-scoped RLS, cap at 10/reaction. Wire into `app/(app)/reactions/new/`.

### P2 (nice-to-have)

- [ ] First 100 users program: tracking sheet outside the repo, but lock the conversion mechanic — free Plus for 6 months in exchange for written reaction-history paragraph.
- [ ] Dermatologist outreach kit: a printable PDF the clinic can hand patients in the lobby (separate doc, not the user-export PDF).

## v6 — clinical handshake (per `docs/PLAN.md` §11)

### P0 (must-ship)

- [ ] `/for-clinicians` landing page describing how the PDF export saves appointment time.
- [ ] One-time, expiring read-only share link for a user's reaction log + PDF (clinician never gets the user's account).

### P1 (should-ship)

- [ ] User-initiated iCloud / Google Drive backup: one-button JSON export of `products` + `reactions` + `user_allergens` to the user's own storage.

## v7+ — scale-readiness (per `docs/PLAN.md` §11)

Roadmap only — do not start unless explicitly prioritized:

- [ ] Multi-region Supabase (EU + US); honor `profiles.region`.
- [ ] Public allergen-dictionary contribution path with editorial review gating.
- [ ] Affiliate-free "products in your list likely Clear for *your* allergens" engagement view.

---

## Continuity rule

`docs/PLAN.md`, `docs/STACK.md`, and this file are the project's institutional memory across rotating agent sessions. See `docs/STACK.md` §16 for the hard rules. The short version:

- **Never delete a shipped entry from this file.** Cancelled work → `[!] dropped — <reason>`.
- **Never wholesale-replace `docs/PLAN.md` or `docs/STACK.md`.** Amend in place.
- **Every shipping PR updates this file in the same PR.**
- **Open work lives here, not in chat.** Chat will be summarized away; this file won't.

---

## Adding to this file

When you finish a task, move it from `[ ]` to `[x]` **in the same PR** and add the PR link. When you discover a new task, append a `[ ]` entry under the right priority bucket with a one-line description and a link to wherever it was first mentioned (a PR comment, an issue, a session URL).

Don't delete shipped entries — the history is the point. If a task gets cancelled, mark it `[!] dropped — <reason>` rather than removing it.
