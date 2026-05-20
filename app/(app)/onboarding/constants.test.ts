import { describe, expect, it } from "vitest";
import { ONBOARDING_PICK_CAP } from "./constants";

describe("ONBOARDING_PICK_CAP", () => {
  // Locks the published cap so a future change is intentional (the
  // marketing copy on /onboarding and the server-side validation in
  // actions.ts both reference this value; PLAN.md §12 risk #4 calls
  // it out as the defense against false-Caution fatigue).
  it("is 5 (PLAN §12 risk #4)", () => {
    expect(ONBOARDING_PICK_CAP).toBe(5);
  });

  it("is a positive integer", () => {
    expect(ONBOARDING_PICK_CAP).toBeGreaterThan(0);
    expect(Number.isInteger(ONBOARDING_PICK_CAP)).toBe(true);
  });
});
