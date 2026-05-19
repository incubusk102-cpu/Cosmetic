"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  onDetected: (barcode: string) => void;
  disabled?: boolean;
  /**
   * If the scanner has been running for this many ms without a detection,
   * `onIdleTimeout` fires. The parent typically uses this to surface an
   * "is the barcode unreadable? try a photo of the ingredients" CTA.
   */
  idleAfterMs?: number;
  onIdleTimeout?: () => void;
}

/**
 * Camera-driven barcode reader. Uses @zxing/browser, loaded lazily so the
 * library only ships to clients that actually open the scanner.
 */
export function BarcodeScanner({
  onDetected,
  disabled = false,
  idleAfterMs,
  onIdleTimeout,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "denied" | "unsupported">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  async function start() {
    setError(null);
    firedRef.current = false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const videoEl = videoRef.current;
      if (!videoEl) return;
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoEl,
        (result, _err, ctrls) => {
          if (result && !firedRef.current) {
            firedRef.current = true;
            const text = result.getText();
            ctrls.stop();
            controlsRef.current = null;
            if (idleTimerRef.current) {
              clearTimeout(idleTimerRef.current);
              idleTimerRef.current = null;
            }
            setStatus("idle");
            onDetected(text);
          }
        },
      );
      controlsRef.current = controls;
      setStatus("running");
      if (idleAfterMs && onIdleTimeout) {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          if (!firedRef.current) onIdleTimeout();
        }, idleAfterMs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Permission|denied|NotAllowed/i.test(msg)) {
        setStatus("denied");
      } else {
        setStatus("idle");
        setError(msg);
      }
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setStatus("idle");
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-ink/10 bg-slate-950">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          aria-label="Camera preview"
        />
        {status !== "running" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 text-paper">
            {status === "denied" ? (
              <div className="px-6 text-center text-sm">
                <CameraOff className="mx-auto mb-2 h-6 w-6" />
                Camera access denied. Enable it in your browser settings, or switch to Manual.
              </div>
            ) : status === "unsupported" ? (
              <div className="px-6 text-center text-sm">
                Your browser doesn&apos;t support camera access here. Switch to Manual.
              </div>
            ) : (
              <div className="px-6 text-center text-sm">
                <Camera className="mx-auto mb-2 h-6 w-6" />
                Camera idle. Tap below to start scanning.
              </div>
            )}
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-paper/70" />
        )}
      </div>

      <div className="flex gap-2">
        {status !== "running" ? (
          <Button
            onClick={start}
            disabled={disabled || status === "starting"}
            className="w-full"
            size="lg"
          >
            {status === "starting" ? "Starting camera…" : "Start scanning"}
          </Button>
        ) : (
          <Button onClick={stop} variant="secondary" className="w-full" size="lg">
            Stop
          </Button>
        )}
      </div>

      {error ? <p className="text-xs text-verdict-avoid">{error}</p> : null}
    </div>
  );
}
