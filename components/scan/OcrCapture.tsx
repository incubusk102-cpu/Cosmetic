"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, ScanText } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  /** Fires with the cleaned OCR text plus the raw text (for debugging). */
  onText: (cleaned: string, raw: string) => void;
  /** Disables the file pickers while a scan is in flight. */
  disabled?: boolean;
}

/**
 * Camera/file capture for an ingredient-list photo. Runs Tesseract.js
 * on-device (lazy-imported the first time the user picks a photo) so we
 * never send the image to a server. The model files are ~10–15 MB and
 * cached by the browser after the first run.
 */
export function OcrCapture({ onText, disabled = false }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runOcr = useCallback(
    async (file: File) => {
      setError(null);
      setProgress(0);
      setStage("loading recognizer…");
      setStatus("loading");
      try {
        const { default: Tesseract } = await import("tesseract.js");
        setStatus("running");
        const { data } = await Tesseract.recognize(file, "eng", {
          logger: (m) => {
            if (typeof m.progress === "number") {
              setProgress(Math.round(m.progress * 100));
            }
            if (typeof m.status === "string") {
              setStage(m.status);
            }
          },
        });
        const raw = data?.text ?? "";
        const { cleanOcrText } = await import("@/lib/ocr/cleanText");
        const cleaned = cleanOcrText(raw);
        if (!cleaned) {
          setStatus("error");
          setError(
            "We couldn't read any ingredients from that photo. Try better lighting, or use the Manual tab.",
          );
          return;
        }
        setStatus("idle");
        onText(cleaned, raw);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus("error");
        setError(msg);
      }
    },
    [onText],
  );

  function handlePick(input: HTMLInputElement | null) {
    const f = input?.files?.[0];
    if (!f) return;
    void runOcr(f);
    // Reset so picking the same file twice still fires `onChange`.
    if (input) input.value = "";
  }

  const busy = status === "loading" || status === "running";

  return (
    <div className="space-y-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handlePick(e.currentTarget)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePick(e.currentTarget)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || busy}
          size="lg"
        >
          <Camera className="h-4 w-4" />
          Take photo
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || busy}
          variant="secondary"
          size="lg"
        >
          <ScanText className="h-4 w-4" />
          Upload image
        </Button>
      </div>

      {busy ? (
        <div className="space-y-2 rounded-xl border border-ink/10 bg-paper-raised px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {stage || "reading ingredients"}
              {progress > 0 ? ` — ${progress}%` : ""}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <p className="text-xs text-ink-muted">
            Runs on your device. The first photo can take 10–20 seconds while the
            recognizer downloads.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-verdict-avoid/30 bg-verdict-avoid/5 px-4 py-3 text-sm text-verdict-avoid">
          {error}
        </p>
      ) : null}
    </div>
  );
}
