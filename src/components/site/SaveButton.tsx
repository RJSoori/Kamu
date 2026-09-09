"use client";

import { useState, useTransition } from "react";
import { saveRestaurant, unsaveRestaurant } from "@/app/(site)/bucket-list/actions";

/**
 * Toggle button for a restaurant's bucket-list membership. Only ever
 * rendered for a signed-in visitor -- the caller (restaurant detail page)
 * decides that server-side and renders a "Log in to save" link instead when
 * there's no session, so this component never has to handle the logged-out
 * case itself.
 */
export function SaveButton({
  restaurantId,
  initiallySaved,
}: {
  restaurantId: string;
  initiallySaved: boolean;
}) {
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setError(null);

    startTransition(async () => {
      const result = nextSaved
        ? await saveRestaurant(restaurantId)
        : await unsaveRestaurant(restaurantId);

      if (result.error) {
        setIsSaved(!nextSaved); // revert the optimistic flip
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={isSaved}
        className={
          isSaved
            ? "rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
            : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        }
      >
        {isSaved ? "Saved ✓" : "Save to bucket list"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
