import { cn } from "@/lib/cn";
import type { Verdict } from "@/lib/supabase/database.types";

const COPY: Record<Verdict, { word: string; tone: string; dot: string }> = {
  // NOTE: "safe" is rendered as "Clear" — we deliberately never claim a product is safe.
  safe: { word: "Clear", tone: "text-verdict-safe", dot: "bg-verdict-safe" },
  caution: {
    word: "Caution",
    tone: "text-verdict-caution",
    dot: "bg-verdict-caution",
  },
  avoid: { word: "Avoid", tone: "text-verdict-avoid", dot: "bg-verdict-avoid" },
};

export function VerdictWord({ verdict }: { verdict: Verdict }) {
  const c = COPY[verdict];
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className={cn("h-3 w-3 rounded-full", c.dot)} />
      <h1
        className={cn(
          "font-serif text-5xl leading-none tracking-tight md:text-6xl",
          c.tone,
        )}
      >
        {c.word}
      </h1>
    </div>
  );
}
