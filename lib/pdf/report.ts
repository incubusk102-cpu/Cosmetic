import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * The dermatologist-handoff PDF: tracked allergens, last 12 months of
 * scanned products, last 12 months of reactions, and a correlations
 * placeholder. Built with `pdf-lib` (pure Node, no JSX, no fonts on disk).
 *
 * The report has a strict legal posture — every page footer reads:
 *   "Cosmetic Allergy Tracker — Personal Reaction Log — Informational only,
 *    not a medical record."
 */

export interface ReportAllergen {
  label: string;
  /** "tracked" (from dictionary) vs "custom" free-text. Shown next to label. */
  kind: "tracked" | "custom";
  /** 1-3. Optional; rendered when present. */
  severity?: number | null;
}

export interface ReportProduct {
  scanned_at: string; // ISO timestamp
  brand: string | null;
  name: string | null;
  source: "barcode" | "ocr" | "manual";
  verdict: "safe" | "caution" | "avoid" | null;
}

export interface ReportReaction {
  occurred_at: string; // ISO timestamp
  severity: number; // 0-4
  body_area: string | null;
  symptoms: string[] | null;
  notes: string | null;
  /** Best-effort product label, denormalized from products if available. */
  product_label: string | null;
}

export interface ReportCorrelationRow {
  /** Normalized ingredient token, e.g. "linalool". */
  token: string;
  /** How many of the user's products contain this ingredient. */
  totalCount: number;
  /** How many of those products triggered at least one reaction. */
  reactedCount: number;
  /** P(reaction | product contains ingredient). */
  reactionRate: number;
  /** Lift over baseline reaction rate. Values > 1 are interesting. */
  lift: number;
}

export interface ReportCorrelations {
  /** Did we have enough data to compute meaningful correlations? */
  eligible: boolean;
  reason?:
    | "not_enough_products"
    | "not_enough_reacted_products"
    | "no_lift_signal";
  /** Baseline P(reaction) across all of the user's products. */
  baseRate: number;
  totalProducts: number;
  reactedProducts: number;
  /** Top correlations by descending lift, already capped by the caller. */
  rows: ReadonlyArray<ReportCorrelationRow>;
}

export interface ReportInput {
  generatedAt: Date;
  /** The user's display name or email — shown on the cover only. */
  userLabel: string;
  /** Inclusive lower bound for `windowEndsAt - 12 months`. */
  windowStartsAt: Date;
  windowEndsAt: Date;
  plan: "free" | "plus";
  allergens: ReportAllergen[];
  products: ReportProduct[];
  reactions: ReportReaction[];
  /**
   * Pre-computed correlations summary. Optional — when omitted the report
   * falls back to a generic "Plus unlocks correlations" blurb so callers
   * don't have to wire the engine just to render a free-tier PDF.
   */
  correlations?: ReportCorrelations;
}

const PAGE = { width: 612, height: 792 }; // US Letter, points
const MARGIN = { top: 56, bottom: 56, left: 48, right: 48 };
const FOOTER_TEXT =
  "Cosmetic Allergy Tracker — Personal Reaction Log — Informational only, not a medical record.";

export async function buildReportPdf(input: ReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Cosmetic Allergy Tracker — Personal Reaction Log");
  doc.setSubject("12-month reaction and ingredient history");
  doc.setCreator("Cosmetic Allergy Tracker");
  doc.setProducer("cosmetic-allergy-tracker");
  doc.setCreationDate(input.generatedAt);

  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };

  const writer = new Writer(doc, fonts);

  // Cover-ish header on page 1.
  writer.heading("Personal Reaction Log");
  writer.metaLine(`Generated ${formatDate(input.generatedAt)}`);
  writer.metaLine(`Account: ${input.userLabel}`);
  writer.metaLine(
    `Window: ${formatDate(input.windowStartsAt)} – ${formatDate(input.windowEndsAt)}`,
  );
  writer.metaLine(`Plan: ${input.plan === "plus" ? "Plus" : "Free"}`);
  writer.spacer(10);

  writer.section("Tracked allergens");
  if (input.allergens.length === 0) {
    writer.body("(no allergens on file)");
  } else {
    for (const a of input.allergens) {
      const tag = a.kind === "custom" ? " (custom)" : "";
      const sev =
        typeof a.severity === "number" ? ` — severity ${a.severity}` : "";
      writer.body(`• ${a.label}${tag}${sev}`);
    }
  }
  writer.spacer(8);

  writer.section(`Products scanned (${input.products.length})`);
  if (input.products.length === 0) {
    writer.body("(no products scanned in the last 12 months)");
  } else {
    for (const p of input.products) {
      const label = displayProduct(p);
      const verdict = p.verdict ? p.verdict.toUpperCase() : "—";
      writer.body(
        `${formatDate(new Date(p.scanned_at))} · ${verdict} · ${label} · [${p.source}]`,
      );
    }
  }
  writer.spacer(8);

  writer.section(`Reactions logged (${input.reactions.length})`);
  if (input.reactions.length === 0) {
    writer.body("(no reactions logged in the last 12 months)");
  } else {
    for (const r of input.reactions) {
      const head = `${formatDate(new Date(r.occurred_at))} · severity ${r.severity}`;
      const where = r.body_area ? ` · ${r.body_area}` : "";
      const sym = r.symptoms?.length ? ` · ${r.symptoms.join(", ")}` : "";
      const prod = r.product_label ? ` · product: ${r.product_label}` : "";
      writer.body(head + where + sym + prod);
      if (r.notes) writer.bodyMuted(`  ${r.notes}`);
    }
  }
  writer.spacer(8);

  writer.section("Top suspicious ingredients");
  if (input.plan === "plus") {
    renderCorrelations(writer, input.correlations);
  } else {
    writer.body(
      "Plus unlocks per-ingredient correlations: which ingredients show up more often in products you've reacted to than in those you haven't.",
    );
  }

  writer.finish();
  return doc.save();
}

interface Fonts {
  body: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

/**
 * Tiny, deliberately dumb layout engine: track Y, page-break when we run
 * out of room. pdf-lib doesn't ship one; ours is small enough to keep
 * in this file and lets the report stay deterministic.
 */
class Writer {
  private page: PDFPage;
  private y: number;
  private readonly pages: PDFPage[] = [];

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Fonts,
  ) {
    this.page = this.newPage();
    this.y = PAGE.height - MARGIN.top;
  }

  heading(text: string) {
    this.ensureRoom(34);
    this.page.drawText(text, {
      x: MARGIN.left,
      y: this.y - 22,
      size: 22,
      font: this.fonts.bold,
      color: rgb(0.13, 0.13, 0.14),
    });
    this.y -= 34;
  }

  section(text: string) {
    this.ensureRoom(28);
    this.page.drawText(text, {
      x: MARGIN.left,
      y: this.y - 16,
      size: 14,
      font: this.fonts.bold,
      color: rgb(0.18, 0.18, 0.2),
    });
    this.y -= 24;
    this.page.drawLine({
      start: { x: MARGIN.left, y: this.y },
      end: { x: PAGE.width - MARGIN.right, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    this.y -= 6;
  }

  metaLine(text: string) {
    this.drawWrapped(text, 10, this.fonts.body, rgb(0.36, 0.36, 0.4));
  }

  body(text: string) {
    this.drawWrapped(text, 11, this.fonts.body, rgb(0.13, 0.13, 0.14));
  }

  bodyMuted(text: string) {
    this.drawWrapped(text, 10, this.fonts.italic, rgb(0.42, 0.42, 0.46));
  }

  spacer(h: number) {
    this.y -= h;
  }

  finish() {
    // Paint footers on every page once layout is done.
    for (const p of this.pages) {
      p.drawText(FOOTER_TEXT, {
        x: MARGIN.left,
        y: 24,
        size: 8,
        font: this.fonts.italic,
        color: rgb(0.45, 0.45, 0.5),
      });
    }
  }

  private newPage(): PDFPage {
    const p = this.doc.addPage([PAGE.width, PAGE.height]);
    this.pages.push(p);
    return p;
  }

  private ensureRoom(needed: number) {
    if (this.y - needed < MARGIN.bottom + 12) {
      this.page = this.newPage();
      this.y = PAGE.height - MARGIN.top;
    }
  }

  private drawWrapped(
    text: string,
    size: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
  ) {
    const maxWidth = PAGE.width - MARGIN.left - MARGIN.right;
    const lines = wrapText(text, font, size, maxWidth);
    const lineHeight = size + 4;
    for (const line of lines) {
      this.ensureRoom(lineHeight);
      this.y -= lineHeight;
      this.page.drawText(line, {
        x: MARGIN.left,
        y: this.y,
        size,
        font,
        color,
      });
    }
    this.y -= 2;
  }
}

function renderCorrelations(writer: Writer, c: ReportCorrelations | undefined) {
  if (!c) {
    writer.body(
      "Top suspicious ingredients (lift analysis) appear on /insights in the app.",
    );
    writer.bodyMuted("Per-ingredient lift tables ship in a follow-up release.");
    return;
  }
  if (!c.eligible || c.rows.length === 0) {
    const reason =
      c.reason === "not_enough_products"
        ? "Not enough scanned products yet — keep scanning to unlock this."
        : c.reason === "not_enough_reacted_products"
          ? "Not enough reactions linked to a product yet — attach products to reactions on /reactions."
          : "No ingredient stands out above the baseline reaction rate yet.";
    writer.body(reason);
    return;
  }
  writer.body(
    `Baseline reaction rate: ${formatPercent(c.baseRate)} (${c.reactedProducts}/${c.totalProducts} products).`,
  );
  writer.bodyMuted(
    "Lift = P(reaction | ingredient) ÷ baseline. Pattern only — not a diagnosis.",
  );
  writer.spacer(4);
  // Header line. Keep tabular: name (wide) · 3 numeric columns.
  writer.body("Ingredient · reacted/total · rate · lift");
  for (const row of c.rows) {
    const ratio = `${row.reactedCount}/${row.totalCount}`;
    const rate = formatPercent(row.reactionRate);
    const lift = `×${row.lift.toFixed(2)}`;
    writer.body(`${row.token} · ${ratio} · ${rate} · ${lift}`);
  }
}

function formatPercent(p: number): string {
  if (!isFinite(p) || p < 0) return "0%";
  return `${Math.round(p * 100)}%`;
}

function displayProduct(p: ReportProduct): string {
  if (p.brand && p.name) return `${p.brand} — ${p.name}`;
  return p.name ?? p.brand ?? "(unnamed product)";
}

function formatDate(d: Date): string {
  // YYYY-MM-DD, UTC, locale-independent for the dermatologist artifact.
  return d.toISOString().slice(0, 10);
}

/**
 * Wrap `text` into lines that each fit `maxWidth` when rendered with
 * `font` at `size`. pdf-lib's StandardFonts don't measure with kerning,
 * but `widthOfTextAtSize` is good enough for monospaced-ish content.
 */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\r?\n/);
  for (const para of paragraphs) {
    if (para.length === 0) {
      out.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else if (line) {
        out.push(line);
        line = word;
      } else {
        // Single word too wide — push it anyway; pdf-lib will overflow but
        // it's the same outcome you'd get on a real cosmetic label name.
        out.push(word);
        line = "";
      }
    }
    if (line) out.push(line);
  }
  return out;
}
