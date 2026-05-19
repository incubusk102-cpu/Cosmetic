"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Keyboard } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarcodeScanner } from "@/components/scan/BarcodeScanner";
import { runBarcodeScan, runManualScan } from "./actions";

type Mode = "barcode" | "manual";

export function ScanWorkspace() {
  const [mode, setMode] = useState<Mode>("barcode");
  const [ingredients, setIngredients] = useState("");
  const [productName, setProductName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleBarcode(barcode: string) {
    setError(null);
    startTransition(async () => {
      const res = await runBarcodeScan(barcode);
      if (res.ok) {
        router.push(`/scan/result/${res.productId}`);
      } else {
        setError(res.error);
      }
    });
  }

  function handleManual() {
    setError(null);
    if (!ingredients.trim()) {
      setError("Paste the ingredients list to continue.");
      return;
    }
    startTransition(async () => {
      const res = await runManualScan({
        ingredients,
        productName: productName.trim() || null,
      });
      if (res.ok) {
        router.push(`/scan/result/${res.productId}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === "barcode" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setMode("barcode")}
        >
          <Camera className="h-4 w-4" />
          Barcode
        </Button>
        <Button
          variant={mode === "manual" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          <Keyboard className="h-4 w-4" />
          Manual
        </Button>
      </div>

      {mode === "barcode" ? (
        <Card>
          <CardTitle>Scan a barcode</CardTitle>
          <CardDescription>
            Hold the product 4–6 inches from the camera. Most beauty packaging works.
          </CardDescription>
          <div className="mt-4">
            <BarcodeScanner onDetected={handleBarcode} disabled={isPending} />
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>Type or paste ingredients</CardTitle>
          <CardDescription>
            One comma-separated list, exactly as printed on the label.
          </CardDescription>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm text-ink-soft">Product name (optional)</span>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Gentle Cleanser"
                className="mt-1 block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm text-ink-soft">Ingredients</span>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={6}
                placeholder="Aqua, Glycerin, Cetearyl Alcohol, …"
                className="mt-1 block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </label>
            <Button onClick={handleManual} disabled={isPending} className="w-full" size="lg">
              {isPending ? "Checking…" : "Check this product"}
            </Button>
          </div>
        </Card>
      )}

      {error ? (
        <p className="rounded-xl border border-verdict-avoid/30 bg-verdict-avoid/5 px-4 py-3 text-sm text-verdict-avoid">
          {error}
        </p>
      ) : null}

      <p className="px-1 text-xs text-ink-muted">
        Informational only. Not medical advice or a diagnosis.
      </p>
    </div>
  );
}
