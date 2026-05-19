"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOut } from "./actions";

export function AccountActions() {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  function onSignOut() {
    startTransition(async () => {
      await signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardTitle>Sign out</CardTitle>
        <CardDescription>End this session on this device.</CardDescription>
        <div className="mt-4">
          <Button onClick={onSignOut} variant="secondary" disabled={isPending}>
            {isPending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently removes your profile, allergens, products, and reactions. This cannot be
          undone.
        </CardDescription>
        <div className="mt-4 flex items-center gap-2">
          {!confirmDelete ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete account
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" disabled>
                Contact support to confirm
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
