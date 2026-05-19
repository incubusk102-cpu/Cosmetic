import "server-only";

export interface OBFProduct {
  brand: string | null;
  name: string | null;
  ingredients_raw: string | null;
}

const BASE = "https://world.openbeautyfacts.org/api/v2/product";

/**
 * Fetch product metadata from Open Beauty Facts by barcode.
 *
 * Returns null when:
 *   - the barcode is empty/non-numeric
 *   - the API returns a non-2xx response
 *   - the API returns status=0 (unknown product)
 *
 * Caches at the fetch layer for 24h to be a polite citizen.
 */
export async function fetchProductByBarcode(
  barcode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OBFProduct | null> {
  const safe = (barcode ?? "").replace(/[^0-9]/g, "");
  if (!safe) return null;

  const url = `${BASE}/${safe}.json?fields=brands,product_name,ingredients_text`;
  const res = await fetchImpl(url, {
    headers: {
      "User-Agent":
        process.env.OPEN_BEAUTY_FACTS_USER_AGENT ??
        "CosmeticAllergyTracker/0.1 (https://github.com/incubusk102-cpu/Cosmetic)",
    },
    // Next.js fetch cache; ignored under vitest where global fetch is mocked.
    next: { revalidate: 60 * 60 * 24 },
  } as RequestInit);

  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as ObfResponse | null;
  if (!data || data.status === 0 || !data.product) return null;

  const p = data.product;
  return {
    brand: extractFirstBrand(p.brands),
    name: typeof p.product_name === "string" && p.product_name.trim() ? p.product_name.trim() : null,
    ingredients_raw:
      typeof p.ingredients_text === "string" && p.ingredients_text.trim()
        ? p.ingredients_text.trim()
        : null,
  };
}

function extractFirstBrand(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const first = raw.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

interface ObfResponse {
  status?: 0 | 1;
  product?: {
    brands?: string;
    product_name?: string;
    ingredients_text?: string;
  };
}
