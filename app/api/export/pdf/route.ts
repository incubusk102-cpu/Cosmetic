import { NextResponse } from "next/server";
import { getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { ALLERGENS_BY_KEY } from "@/lib/allergens/data";
import { checkPdfQuota, currentPdfExportPeriod, type Plan } from "@/lib/pdf/quota";
import {
  buildReportPdf,
  type ReportAllergen,
  type ReportProduct,
  type ReportReaction,
} from "@/lib/pdf/report";

// pdf-lib bundles for the browser too, but the route handler runs server-side.
// Force Node runtime so we can stream bytes back without edge-runtime caveats.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const now = new Date();
  const windowStartsAt = new Date(now.getTime() - ONE_YEAR_MS);
  const windowStartsAtIso = windowStartsAt.toISOString();

  // ── 1. Quota check ──────────────────────────────────────────────────
  const profileRes = await supabase
    .from("profiles")
    .select("plan, pdf_exports_used_this_month, pdf_exports_period")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRes.error) {
    return NextResponse.json(
      { error: "Could not read your profile." },
      { status: 500 },
    );
  }

  // If the profile row doesn't exist yet, the auth trigger should have
  // created it. Fall back to defaults so the export still works.
  const plan: Plan = (profileRes.data?.plan ?? "free") as Plan;
  const usedThisMonth = profileRes.data?.pdf_exports_used_this_month ?? 0;
  const period =
    profileRes.data?.pdf_exports_period ?? currentPdfExportPeriod(now);

  const check = checkPdfQuota({ plan, usedThisMonth, period }, now);
  if (!check.allowed) {
    return NextResponse.json(
      {
        error:
          "Free accounts include one PDF export per month. Upgrade to Plus for unlimited exports.",
        code: check.reason,
      },
      { status: 402 },
    );
  }

  // ── 2. Gather data ──────────────────────────────────────────────────
  const [allergensRes, productsRes, reactionsRes] = await Promise.all([
    supabase
      .from("user_allergens")
      .select("allergen_key, custom_label, severity")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("scanned_at, brand, name, source, last_verdict")
      .eq("user_id", user.id)
      .gte("scanned_at", windowStartsAtIso)
      .order("scanned_at", { ascending: false }),
    supabase
      .from("reactions")
      .select(
        "occurred_at, severity, body_area, symptoms, notes, products(brand, name)",
      )
      .eq("user_id", user.id)
      .gte("occurred_at", windowStartsAtIso)
      .order("occurred_at", { ascending: false }),
  ]);

  const allergens: ReportAllergen[] = (allergensRes.data ?? []).map((row) => {
    if (row.allergen_key) {
      const entry = ALLERGENS_BY_KEY.get(row.allergen_key);
      return {
        label: entry?.canonical ?? row.allergen_key,
        kind: "tracked",
        severity: row.severity,
      };
    }
    return {
      label: row.custom_label ?? "(unknown)",
      kind: "custom",
      severity: row.severity,
    };
  });

  const products: ReportProduct[] = (productsRes.data ?? []).map((row) => ({
    scanned_at: row.scanned_at,
    brand: row.brand,
    name: row.name,
    source: row.source,
    verdict: row.last_verdict,
  }));

  const reactions: ReportReaction[] = (reactionsRes.data ?? []).map((row) => {
    // Supabase's PostgREST returns the joined product as an object or an
    // array depending on how it inferred the relationship. Handle both.
    const productJoin = (row as { products?: unknown }).products;
    const product = Array.isArray(productJoin)
      ? (productJoin[0] as { brand: string | null; name: string | null } | undefined)
      : (productJoin as { brand: string | null; name: string | null } | null | undefined);
    return {
      occurred_at: row.occurred_at,
      severity: row.severity,
      body_area: row.body_area,
      symptoms: row.symptoms,
      notes: row.notes,
      product_label: product
        ? [product.brand, product.name].filter(Boolean).join(" — ") || null
        : null,
    };
  });

  // ── 3. Render PDF ───────────────────────────────────────────────────
  const bytes = await buildReportPdf({
    generatedAt: now,
    userLabel: user.email ?? user.id,
    windowStartsAt,
    windowEndsAt: now,
    plan,
    allergens,
    products,
    reactions,
  });

  // ── 4. Persist updated quota counter ────────────────────────────────
  // Best-effort write — if the row doesn't exist yet, upsert it.
  try {
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          pdf_exports_used_this_month: check.nextUsedThisMonth,
          pdf_exports_period: check.nextPeriod,
        },
        { onConflict: "id" },
      );
  } catch {
    // Quota tracking is non-fatal — the user already got their PDF.
  }

  const filename = `cosmetic-reaction-log-${now.toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
