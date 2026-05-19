"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { sendMagicLink } from "./actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const res = await sendMagicLink(email);
    if (res.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-verdict-safe/30 bg-verdict-safe/5 px-4 py-3 text-sm text-verdict-safe">
        Check <span className="font-medium">{email}</span> for your sign-in link.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="text-sm text-ink-soft">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-ink/10 bg-paper-raised px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          placeholder="you@example.com"
        />
      </label>
      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </Button>
      {error ? <p className="text-sm text-verdict-avoid">{error}</p> : null}
    </form>
  );
}
