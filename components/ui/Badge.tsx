import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "safe" | "caution" | "avoid";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-soft",
  safe: "bg-verdict-safe/10 text-verdict-safe",
  caution: "bg-verdict-caution/10 text-verdict-caution",
  avoid: "bg-verdict-avoid/10 text-verdict-avoid",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
