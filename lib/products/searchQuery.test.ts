import { describe, expect, it } from "vitest";
import {
  MIN_QUERY_LENGTH,
  sanitizeProductSearchQuery,
} from "./searchQuery";

describe("sanitizeProductSearchQuery", () => {
  it("rejects empty and whitespace-only input", () => {
    expect(sanitizeProductSearchQuery("")).toEqual({
      ok: false,
      reason: "too_short",
    });
    expect(sanitizeProductSearchQuery("   ")).toEqual({
      ok: false,
      reason: "too_short",
    });
  });

  it("rejects input below the minimum length", () => {
    expect(sanitizeProductSearchQuery("a")).toEqual({
      ok: false,
      reason: "too_short",
    });
    expect(MIN_QUERY_LENGTH).toBe(2);
  });

  it("accepts input at the minimum length and wraps in %", () => {
    expect(sanitizeProductSearchQuery("ab")).toEqual({
      ok: true,
      pattern: "%ab%",
    });
  });

  it("trims surrounding whitespace before the length check", () => {
    expect(sanitizeProductSearchQuery("  hi  ")).toEqual({
      ok: true,
      pattern: "%hi%",
    });
  });

  it("escapes ILIKE wildcards so user-typed % and _ are literal", () => {
    expect(sanitizeProductSearchQuery("100%_pure")).toEqual({
      ok: true,
      pattern: "%100\\%\\_pure%",
    });
  });

  it("escapes backslashes before the other wildcards", () => {
    // A literal backslash in the user's input must survive as a backslash,
    // not be consumed by the `%` escape that comes next.
    expect(sanitizeProductSearchQuery("a\\b")).toEqual({
      ok: true,
      pattern: "%a\\\\b%",
    });
  });

  it("leaves regular alphanumeric input alone", () => {
    expect(sanitizeProductSearchQuery("La Roche-Posay")).toEqual({
      ok: true,
      pattern: "%La Roche-Posay%",
    });
  });
});
