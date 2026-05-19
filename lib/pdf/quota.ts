/**
 * Free / Plus quota check for PDF exports. Pure functions so the decision
 * is fully testable without hitting Supabase. The route handler reads the
 * profile, calls `checkPdfQuota`, and writes the returned `next*` fields
 * back to the row.
 */
export type Plan = "free" | "plus";

export interface PdfQuotaState {
  plan: Plan;
  /** Counter as stored in `profiles.pdf_exports_used_this_month`. */
  usedThisMonth: number;
  /** Period the counter belongs to, format "YYYY-MM" (UTC). */
  period: string;
}

export type PdfQuotaCheck =
  | {
      allowed: true;
      /** Value to write back to `pdf_exports_used_this_month`. */
      nextUsedThisMonth: number;
      /** Value to write back to `pdf_exports_period`. */
      nextPeriod: string;
    }
  | {
      allowed: false;
      reason: "free_monthly_limit_reached";
      /** Period rolled over by check; safe to persist alongside the rejection. */
      nextPeriod: string;
    };

const FREE_TIER_LIMIT_PER_MONTH = 1;

export function currentPdfExportPeriod(now: Date = new Date()): string {
  // ISO date "YYYY-MM-DDTHH..." → slice the first 7 characters → "YYYY-MM".
  // Always in UTC so cross-timezone users get a deterministic boundary.
  return now.toISOString().slice(0, 7);
}

export function checkPdfQuota(
  state: PdfQuotaState,
  now: Date = new Date(),
): PdfQuotaCheck {
  const period = currentPdfExportPeriod(now);
  // Reset counter when the period rolled over.
  const usedThisMonth = state.period === period ? state.usedThisMonth : 0;

  if (state.plan === "plus") {
    return {
      allowed: true,
      nextUsedThisMonth: usedThisMonth + 1,
      nextPeriod: period,
    };
  }

  if (usedThisMonth >= FREE_TIER_LIMIT_PER_MONTH) {
    return {
      allowed: false,
      reason: "free_monthly_limit_reached",
      nextPeriod: period,
    };
  }

  return {
    allowed: true,
    nextUsedThisMonth: usedThisMonth + 1,
    nextPeriod: period,
  };
}
