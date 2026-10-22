"use server";

import { revalidatePath } from "next/cache";
import { upsertMyReview, deleteMyReview } from "@/lib/data/reviews";
import { REPORT_REASONS } from "@/lib/report-reasons";
import { createClient } from "@/lib/supabase/server";

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


export interface ReportFormState {
  error: string | null;
  sent: boolean;
}

/**
 * Bound to (restaurantId, menuItemId) -- menuItemId null means the report is
 * about the listing itself. RLS sets reporter_id and forces status "open".
 */
export async function submitReport(
  restaurantId: string,
  menuItemId: string | null,
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim() || null;

  if (!REPORT_REASONS.some(([value]) => value === reason)) {
    return { error: "Pick a reason.", sent: false };
  }
  if (details && details.length > 2000) {
    return { error: "Keep details under 2000 characters.", sent: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").insert({
    restaurant_id: restaurantId,
    menu_item_id: menuItemId,
    reason,
    details,
  });

  if (error) {
    // 23505 = unique index: this person already has an open report on it.
    return {
      error:
        error.code === "23505"
          ? "You've already reported this. We'll look at it soon."
          : error.message,
      sent: false,
    };
  }

  return { error: null, sent: true };
}
