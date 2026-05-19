import { describe, expect, it } from "vitest";
import { checkPdfQuota, currentPdfExportPeriod } from "./quota";

const JAN_2026 = new Date("2026-01-15T10:00:00Z");
const FEB_2026 = new Date("2026-02-01T00:00:01Z");
const DEC_2025 = new Date("2025-12-31T23:59:59Z");

describe("currentPdfExportPeriod", () => {
  it("formats UTC date as YYYY-MM", () => {
    expect(currentPdfExportPeriod(JAN_2026)).toBe("2026-01");
    expect(currentPdfExportPeriod(FEB_2026)).toBe("2026-02");
    expect(currentPdfExportPeriod(DEC_2025)).toBe("2025-12");
  });
});

describe("checkPdfQuota", () => {
  it("allows a free user's first export of the month", () => {
    const out = checkPdfQuota(
      { plan: "free", usedThisMonth: 0, period: "2026-01" },
      JAN_2026,
    );
    expect(out).toEqual({
      allowed: true,
      nextUsedThisMonth: 1,
      nextPeriod: "2026-01",
    });
  });

  it("blocks a free user's second export in the same month", () => {
    const out = checkPdfQuota(
      { plan: "free", usedThisMonth: 1, period: "2026-01" },
      JAN_2026,
    );
    expect(out).toEqual({
      allowed: false,
      reason: "free_monthly_limit_reached",
      nextPeriod: "2026-01",
    });
  });

  it("resets the free counter on a new month", () => {
    const out = checkPdfQuota(
      { plan: "free", usedThisMonth: 1, period: "2026-01" },
      FEB_2026,
    );
    expect(out).toEqual({
      allowed: true,
      nextUsedThisMonth: 1,
      nextPeriod: "2026-02",
    });
  });

  it("allows plus users every time", () => {
    for (let used = 0; used < 5; used++) {
      const out = checkPdfQuota(
        { plan: "plus", usedThisMonth: used, period: "2026-01" },
        JAN_2026,
      );
      expect(out.allowed).toBe(true);
      if (out.allowed) {
        expect(out.nextUsedThisMonth).toBe(used + 1);
      }
    }
  });

  it("plus users get the counter reset when the period rolls over", () => {
    const out = checkPdfQuota(
      { plan: "plus", usedThisMonth: 42, period: "2025-12" },
      JAN_2026,
    );
    expect(out).toEqual({
      allowed: true,
      nextUsedThisMonth: 1,
      nextPeriod: "2026-01",
    });
  });

  it("treats a missing/blank period as 'reset on first use'", () => {
    const out = checkPdfQuota(
      { plan: "free", usedThisMonth: 1, period: "" },
      JAN_2026,
    );
    expect(out).toEqual({
      allowed: true,
      nextUsedThisMonth: 1,
      nextPeriod: "2026-01",
    });
  });
});
