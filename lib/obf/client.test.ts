import { describe, it, expect, vi } from "vitest";
import { fetchProductByBarcode } from "./client";

function makeMockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("fetchProductByBarcode", () => {
  it("returns null for an empty barcode", async () => {
    const fetchSpy = vi.fn();
    const r = await fetchProductByBarcode("", fetchSpy as unknown as typeof fetch);
    expect(r).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null for a non-numeric barcode", async () => {
    const fetchSpy = vi.fn();
    const r = await fetchProductByBarcode("abc", fetchSpy as unknown as typeof fetch);
    expect(r).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null on a 404 response", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(makeMockResponse({}, false, 404));
    const r = await fetchProductByBarcode("000", fetchSpy as unknown as typeof fetch);
    expect(r).toBeNull();
  });

  it("returns null when the API responds with status=0", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(makeMockResponse({ status: 0 }));
    const r = await fetchProductByBarcode("1234567890123", fetchSpy as unknown as typeof fetch);
    expect(r).toBeNull();
  });

  it("returns normalized product data on a hit", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      makeMockResponse({
        status: 1,
        product: {
          brands: "ACME, OtherBrand",
          product_name: "Gentle Cleanser",
          ingredients_text: "Aqua, Glycerin, Linalool, Parfum",
        },
      }),
    );
    const r = await fetchProductByBarcode("1234567890123", fetchSpy as unknown as typeof fetch);
    expect(r).toEqual({
      brand: "ACME",
      name: "Gentle Cleanser",
      ingredients_raw: "Aqua, Glycerin, Linalool, Parfum",
    });
  });

  it("strips non-numeric characters from the barcode before fetching", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      makeMockResponse({
        status: 1,
        product: { brands: "X", product_name: "Y", ingredients_text: "Z" },
      }),
    );
    await fetchProductByBarcode("123-456 789", fetchSpy as unknown as typeof fetch);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchSpy.mock.calls[0]!;
    expect(String(calledUrl)).toContain("/123456789.json");
  });
});
