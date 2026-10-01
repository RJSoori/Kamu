import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Review {
  id: string;
  restaurant_id: string;
  customer_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
}

const REVIEW_COLUMNS =
  "id, restaurant_id, customer_id, rating, review_text, created_at";

/**
 * All reviews for a restaurant, newest first. RLS already scopes this to
 * published restaurants for anon/customer sessions (reviews_select_published_or_admin),
 * so no separate is_published check is needed here.
 */
export async function getReviewsByRestaurant(
  restaurantId: string,
): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Review[];
}

export function summarizeReviews(reviews: Review[]): ReviewSummary {
  if (reviews.length === 0) {
    return { average: null, count: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return { average: total / reviews.length, count: reviews.length };
}

/**
 * The signed-in customer's own review for this restaurant, if any. The
 * reviews table has no DB-level uniqueness on (customer_id, restaurant_id)
 * -- this is an app-level "one review per person per place" rule, enforced
 * by upsertMyReview always updating this row instead of inserting a new one
 * when it exists.
 */
export async function getMyReviewForRestaurant(
  restaurantId: string,
): Promise<Review | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Review | null;
}

export async function upsertMyReview(
  restaurantId: string,
  rating: number,
  reviewText: string,
  existingReviewId?: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in to post a review.");
  }

  if (existingReviewId) {
    const { error } = await supabase
      .from("reviews")
      .update({ rating, review_text: reviewText })
      .eq("id", existingReviewId)
      .eq("customer_id", user.id);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("reviews").insert({
    restaurant_id: restaurantId,
    customer_id: user.id,
    rating,
    review_text: reviewText,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteMyReview(reviewId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in.");
  }

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("customer_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
