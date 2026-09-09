"use server";

import { revalidatePath } from "next/cache";
import { upsertMyReview, deleteMyReview } from "@/lib/data/reviews";

export interface ReviewFormState {
  error: string | null;
}

/**
 * Bound to (restaurantId, existingReviewId) via .bind() on the client before
 * being handed to useActionState -- see ReviewForm. existingReviewId is set
 * when the signed-in customer already has a review for this restaurant, in
 * which case this updates it in place instead of inserting a second one.
 */
export async function submitReview(
  restaurantId: string,
  existingReviewId: string | null,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const rating = Number(formData.get("rating"));
  const reviewText = String(formData.get("review_text") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a star rating from 1 to 5." };
  }
  if (!reviewText) {
    return { error: "Write a few words about your visit." };
  }

  try {
    await upsertMyReview(
      restaurantId,
      rating,
      reviewText,
      existingReviewId ?? undefined,
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save review.",
    };
  }

  revalidatePath(`/restaurants/${restaurantId}`);
  return { error: null };
}

export async function removeReview(
  reviewId: string,
  restaurantId: string,
): Promise<{ error: string | null }> {
  try {
    await deleteMyReview(reviewId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete review.",
    };
  }

  revalidatePath(`/restaurants/${restaurantId}`);
  return { error: null };
}
