/**
 * Soft cap on the *initial* allergen selection at onboarding to prevent
 * false-Caution fatigue (PLAN.md §12 risk #4). Users can always add more
 * later from /settings/allergens. The cap counts dictionary keys + custom
 * free-text labels together.
 *
 * Enforced both client-side (for UX) and server-side (defense in depth).
 *
 * Lives in its own module because Next.js "use server" files can only
 * export async functions.
 */
export const ONBOARDING_PICK_CAP = 5;
