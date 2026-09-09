"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewFormState } from "@/app/(site)/restaurants/[id]/actions";
import type { Review } from "@/lib/data/reviews";

const initialState: ReviewFormState = { error: null };

/**
 * Doubles as "post a review" and "edit your review" -- existingReview
 * decides which via the bound existingReviewId arg on the action, and
 * pre-fills the fields.
 */
export function ReviewForm({
  restaurantId,
  existingReview,
}: {
  restaurantId: string;
  existingReview: Review | null;
}) {
  const boundAction = submitReview.bind(
    null,
    restaurantId,
    existingReview?.id ?? null,
  );
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );
  const [rating, setRating] = useState(existingReview?.rating ?? 0);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"
    >
      <p className="text-sm font-semibold text-slate-900">
        {existingReview ? "Edit your review" : "Leave a review"}
      </p>

      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1 text-2xl text-amber-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className="leading-none"
          >
            {star <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        name="review_text"
        required
        rows={3}
        defaultValue={existingReview?.review_text ?? ""}
        placeholder="How was it?"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />

      {state.error ? (
        <p className="text-sm text-rose-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
      >
        {isPending ? "Saving…" : existingReview ? "Update review" : "Post review"}
      </button>
    </form>
  );
}
