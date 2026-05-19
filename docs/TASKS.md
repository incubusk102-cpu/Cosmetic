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

- [~] **#1** Expose the shared `product_cache` from the new-reaction flow so users can attach to products they haven't personally scanned. Imports the cached product into the user's `products` table on first pick. ([PR #8](https://github.com/incubusk102-cpu/Cosmetic/pull/8) — open, CI green; deferred from [PR #5](https://github.com/incubusk102-cpu/Cosmetic/pull/5))
- [ ] **#2** [intentionally blank — slot reserved if a third P0 surfaces. Update this entry or delete it once the v3 handoff doc is recovered.]
- [ ] **#3** Loosen `computeCorrelations()` eligibility gates for early/dogfood data. Current production defaults: `minProducts=5`, `minReactedProducts=2`, `minProductOccurrences=3`. Candidate looser values: `3 / 2 / 2`. ([deferred from #6 description](https://github.com/incubusk102-cpu/Cosmetic/pull/6))

### P1 (should-ship)

- [x] Attach an existing reaction to one of the user's products from the `/reactions` list, so the correlations engine has data ([#5](https://github.com/incubusk102-cpu/Cosmetic/pull/5))
- [x] Pipe correlations into the Plus-tier PDF export ([#6](https://github.com/incubusk102-cpu/Cosmetic/pull/6))
- [x] Cancel the user's Stripe subscription when they delete their account ([#7](https://github.com/incubusk102-cpu/Cosmetic/pull/7))
- [ ] Extend the `AttachProductRow` on `/reactions` to search the global `product_cache` (parallel to v3 P0 #1 but for the existing-reaction case).

### P2 (nice-to-have)

- [ ] First-class onboarding for the allergen list (the `app/(app)/onboarding/` page exists; audit the flow end-to-end and tighten the empty / partial states).
- [ ] Surface a "structural ingredients we filter out" footnote near the correlations table so the methodology is transparent.

---

## Adding to this file

When you finish a task, move it from `[ ]` to `[x]` **in the same PR** and add the PR link. When you discover a new task, append a `[ ]` entry under the right priority bucket with a one-line description and a link to wherever it was first mentioned (a PR comment, an issue, a session URL).

Don't delete shipped entries — the history is the point. If a task gets cancelled, mark it `[!] dropped — <reason>` rather than removing it.
