"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  label: string;
}

export const Chip = React.forwardRef<HTMLButtonElement, Props>(function Chip(
  { selected = false, label, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/30",
        selected
          ? "border-accent bg-accent/10 text-accent-ink"
          : "border-ink/10 bg-paper-raised text-ink hover:border-ink/25",
        className,
      )}
      {...props}
    >
      {selected ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> : null}
      <span>{label}</span>
    </button>
  );
});
