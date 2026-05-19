import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildReportPdf, wrapText, type ReportInput } from "./report";

const SAMPLE: ReportInput = {
  generatedAt: new Date("2026-05-19T12:00:00Z"),
  userLabel: "user@example.com",
  windowStartsAt: new Date("2025-05-19T00:00:00Z"),
  windowEndsAt: new Date("2026-05-19T00:00:00Z"),
  plan: "free",
  allergens: [
    { label: "Linalool", kind: "tracked", severity: 2 },
    { label: "Wisteria oil", kind: "custom" },
  ],
  products: [
    {
      scanned_at: "2026-04-01T10:00:00Z",
      brand: "Lab",
      name: "Gentle Cleanser",
      source: "barcode",
      verdict: "safe",
    },
    {
      scanned_at: "2026-05-15T10:00:00Z",
      brand: null,
      name: "Patchouli Serum",
      source: "ocr",
      verdict: "avoid",
    },
  ],
  reactions: [
    {
      occurred_at: "2026-04-20T10:00:00Z",
      severity: 3,
      body_area: "cheeks",
      symptoms: ["redness", "stinging"],
      notes: "started ~6h after applying",
      product_label: "Lab — Gentle Cleanser",
    },
  ],
};

async function loadReport(bytes: Uint8Array) {
  return PDFDocument.load(bytes);
}

describe("buildReportPdf", () => {
  it("returns a non-empty PDF byte string", async () => {
    const bytes = await buildReportPdf(SAMPLE);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    // PDF magic header
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("has a valid title and creator metadata", async () => {
    const bytes = await buildReportPdf(SAMPLE);
    const pdf = await loadReport(bytes);
    expect(pdf.getTitle()).toContain("Personal Reaction Log");
    // pdf-lib appends its own producer string, but the creator field is
    // ours to set.
    expect(pdf.getCreator()).toBe("Cosmetic Allergy Tracker");
  });

  it("paginates instead of overflowing when there is a lot of data", async () => {
    const many: ReportInput = {
      ...SAMPLE,
      products: Array.from({ length: 80 }, (_, i) => ({
        scanned_at: "2026-04-01T10:00:00Z",
        brand: `Brand ${i}`,
        name: `Product ${i} with a moderately long name`,
        source: "barcode" as const,
        verdict: "safe" as const,
      })),
      reactions: Array.from({ length: 40 }, (_, i) => ({
        occurred_at: "2026-04-20T10:00:00Z",
        severity: (i % 5) as number,
        body_area: "cheeks",
        symptoms: ["redness"],
        notes: null,
        product_label: `Product ${i}`,
      })),
    };
    const bytes = await buildReportPdf(many);
    const pdf = await loadReport(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it("renders the empty-state copy when there is no history", async () => {
    const empty: ReportInput = {
      ...SAMPLE,
      allergens: [],
      products: [],
      reactions: [],
    };
    const bytes = await buildReportPdf(empty);
    expect(bytes.length).toBeGreaterThan(500);
    const pdf = await loadReport(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it("does not crash on plus-tier input", async () => {
    const plus = { ...SAMPLE, plan: "plus" as const };
    const bytes = await buildReportPdf(plus);
    expect(bytes.length).toBeGreaterThan(500);
  });
});

describe("wrapText", () => {
  it("splits text that exceeds the max width into multiple lines", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText(
      "The quick brown fox jumps over the lazy dog. ".repeat(10),
      font,
      11,
      200,
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 11)).toBeLessThanOrEqual(220);
    }
  });

  it("preserves explicit newlines in the input", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText("first\nsecond\nthird", font, 11, 500);
    expect(lines).toEqual(["first", "second", "third"]);
  });
});
