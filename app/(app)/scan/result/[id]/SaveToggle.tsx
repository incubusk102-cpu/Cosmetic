"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toggleSaveProduct } from "./actions";

export function SaveToggle({
  productId,
  initialSaved,
}: {
  productId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function onClick() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleSaveProduct(productId, next);
      if (!res.ok) setSaved(!next);
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending} variant={saved ? "primary" : "secondary"}>
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Saved" : "Save to My Products"}
    </Button>
  );
}
