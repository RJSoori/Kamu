"use client";

import { useState, useTransition } from "react";
import { removeReview } from "@/app/(site)/restaurants/[id]/actions";

export function ReviewDeleteButton({
  reviewId,
  restaurantId,
}: {
  reviewId: string;
  restaurantId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await removeReview(reviewId, restaurantId);
      if (result.error) {
        setError(result.error);
      }
      // On success the row disappears via revalidatePath -- no local state
      // to clear.
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium text-slate-400 transition hover:text-rose-600 disabled:opacity-60"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
