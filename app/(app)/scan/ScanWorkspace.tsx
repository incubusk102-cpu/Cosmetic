"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Keyboard, ScanText } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarcodeScanner } from "@/components/scan/BarcodeScanner";
import { OcrCapture } from "@/components/scan/OcrCapture";
import { runBarcodeScan, runManualScan, runOcrScan } from "./actions";

type Mode = "barcode" | "ocr" | "manual";

const BARCODE_IDLE_MS = 6000;

export function ScanWorkspace() {
  const [mode, setMode] = useState<Mode>("barcode");
  const [ingredients, setIngredients] = useState("");
  const [productName, setProductName] = useState("");
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleBarcode(barcode: string) {
    setError(null);
    setHint(null);
    startTransition(async () => {
      const res = await runBarcodeScan(barcode);
      if (res.ok) {
        router.push(`/scan/result/${res.productId}`);
      } else {
        setError(res.error);
        if (res.code === "not_found" || res.code === "no_ingredients") {
          setHint("Photograph the ingredients list instead — we'll read it on-device.");
        }
      }
    });
  }

  function handleManual() {
    setError(null);
    setHint(null);
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

  const handleOcrText = useCallback((cleaned: string) => {
    setError(null);
    setHint(null);
    setOcrText(cleaned);
  }, []);

  function handleConfirmOcr() {
    if (!ocrText) return;
    setError(null);
    startTransition(async () => {
      const res = await runOcrScan({
        ingredients: ocrText,
        productName: productName.trim() || null,
      });
      if (res.ok) {
        router.push(`/scan/result/${res.productId}`);
      } else {
        setError(res.error);
      }
    });
  }

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setHint(null);
  }

  function handleBarcodeIdleTimeout() {
    setHint(
      "Barcode not reading? Switch to Ingredient photo and we'll OCR it on-device.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={mode === "barcode" ? "primary" : "secondary"}
          size="sm"
          onClick={() => switchTo("barcode")}
        >
          <Camera className="h-4 w-4" />
          Barcode
        </Button>
        <Button
          variant={mode === "ocr" ? "primary" : "secondary"}
          size="sm"
          onClick={() => switchTo("ocr")}
        >
          <ScanText className="h-4 w-4" />
          Ingredient photo
        </Button>
        <Button
          variant={mode === "manual" ? "primary" : "secondary"}
          size="sm"
          onClick={() => switchTo("manual")}
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
            <BarcodeScanner
              onDetected={handleBarcode}
              disabled={isPending}
              idleAfterMs={BARCODE_IDLE_MS}
              onIdleTimeout={handleBarcodeIdleTimeout}
            />
          </div>
        </Card>
      ) : mode === "ocr" ? (
        <Card>
          <CardTitle>Photograph the ingredients</CardTitle>
          <CardDescription>
            Aim at the printed ingredients block, fill the frame, hold steady. We
            read the text on your device — the photo never leaves your phone.
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
            <OcrCapture onText={handleOcrText} disabled={isPending} />
            {ocrText ? (
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm text-ink-soft">
                    Recognized ingredients (edit if needed)
                  </span>
                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    rows={6}
                    className="mt-1 block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink focus:border-accent focus:outline-none"
                  />
                </label>
                <Button
                  onClick={handleConfirmOcr}
                  disabled={isPending}
                  className="w-full"
                  size="lg"
                >
                  {isPending ? "Checking…" : "Check this product"}
                </Button>
              </div>
            ) : null}
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

      {hint && mode !== "ocr" ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-ink">
          <p>{hint}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => switchTo("ocr")}
          >
            <ScanText className="h-4 w-4" />
            Switch to Ingredient photo
          </Button>
        </div>
      ) : null}

      <p className="px-1 text-xs text-ink-muted">
        Informational only. Not medical advice or a diagnosis.
      </p>
    </div>
  );
}
