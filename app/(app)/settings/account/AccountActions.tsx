"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { deleteAccount, signOut } from "./actions";

export function AccountActions() {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  function onSignOut() {
    startTransition(async () => {
      await signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  function onConfirmDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteAccount();
      if (res.ok) {
        router.replace("/login");
        router.refresh();
      } else {
        setDeleteError(res.error);
      }
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
          Permanently removes your profile, allergens, products, and reactions. Any active Plus
          subscription is cancelled at the same time. This cannot be undone.
        </CardDescription>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!confirmDelete ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete account
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={onConfirmDelete} disabled={isPending}>
                {isPending ? "Deleting…" : "Yes, delete my account"}
              </Button>
            </>
          )}
        </div>
        {deleteError ? (
          <p className="mt-2 text-sm text-verdict-avoid">{deleteError}</p>
        ) : null}
      </Card>
    </div>
  );
}
