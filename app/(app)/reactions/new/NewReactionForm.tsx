"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { createReaction } from "./actions";

const BODY_AREAS = ["face", "eyes", "lips", "scalp", "neck", "body", "hands"] as const;
const SYMPTOMS = [
  "itch",
  "redness",
  "bumps",
  "dryness",
  "burning",
  "swelling",
  "flaking",
  "breakout",
] as const;

export function NewReactionForm({ productId }: { productId: string | null }) {
  const [severity, setSeverity] = useState<number>(2);
  const [bodyArea, setBodyArea] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleSymptom(s: string) {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createReaction({
        productId,
        severity,
        bodyArea,
        symptoms: Array.from(symptoms),
        notes: notes.trim() || null,
      });
      if (res.ok) {
        router.push("/reactions");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium text-ink">Severity</label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <span className="w-24 text-right text-sm tabular text-ink-soft">
            {["None", "Mild", "Moderate", "Significant", "Severe"][severity]}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Body area</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BODY_AREAS.map((a) => (
            <Chip
              key={a}
              label={a}
              selected={bodyArea === a}
              onClick={() => setBodyArea(bodyArea === a ? null : a)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Symptoms</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={symptoms.has(s)}
              onClick={() => toggleSymptom(s)}
            />
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-ink">Notes (optional)</span>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          placeholder="What happened?"
        />
      </label>

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? "Saving…" : "Save reaction"}
      </Button>
      {error ? <p className="text-sm text-verdict-avoid">{error}</p> : null}
    </form>
  );
}
