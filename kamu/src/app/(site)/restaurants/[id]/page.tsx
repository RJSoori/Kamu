import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantById } from "@/lib/data/restaurants";
import { getMenuItemsByRestaurant, type MenuItem } from "@/lib/data/menu-items";
import { isRestaurantSaved } from "@/lib/data/bucket-list";
import {
  getMyReviewForRestaurant,
  getReviewsByRestaurant,
  summarizeReviews,
} from "@/lib/data/reviews";
import { createClient } from "@/lib/supabase/server";
import { SaveButton } from "@/components/site/SaveButton";
import { StarRating } from "@/components/site/StarRating";
import { ReviewForm } from "@/components/site/ReviewForm";
import { ReviewDeleteButton } from "@/components/site/ReviewDeleteButton";
import { RestaurantMap } from "@/components/site/RestaurantMap";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = await getRestaurantById(id);

  if (!restaurant) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [menuItems, saved, reviews, myReview] = await Promise.all([
    getMenuItemsByRestaurant(id),
    user ? isRestaurantSaved(id) : Promise.resolve(false),
    getReviewsByRestaurant(id),
    user ? getMyReviewForRestaurant(id) : Promise.resolve(null),
  ]);
  const menuByCategory = groupByCategory(menuItems);
  const openingHours = Object.entries(restaurant.opening_hours ?? {});
  const reviewSummary = summarizeReviews(reviews);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← All restaurants
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {restaurant.cover_photo_url ? (
            <Image
              src={restaurant.cover_photo_url}
              alt={`${restaurant.name} cover`}
              width={1024}
              height={320}
              className="h-64 w-full object-cover"
            />
          ) : null}

          <div className="space-y-6 p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                  {restaurant.area || "Unknown area"}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {restaurant.name}
                </h1>
                {restaurant.address ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {restaurant.address}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  {restaurant.price_range || "-"}
                </div>
                {user ? (
                  <SaveButton restaurantId={restaurant.id} initiallySaved={saved} />
                ) : (
                  <Link
                    href={`/login?next=/restaurants/${restaurant.id}`}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Log in to save
                  </Link>
                )}
              </div>
            </div>

            {restaurant.cuisine_type && restaurant.cuisine_type.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {restaurant.cuisine_type.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            ) : null}

            {restaurant.vibe_description ? (
              <p className="text-base leading-7 text-slate-700">
                {restaurant.vibe_description}
              </p>
            ) : null}

            {restaurant.latitude && restaurant.longitude ? (
              <RestaurantMap
                latitude={restaurant.latitude}
                longitude={restaurant.longitude}
                name={restaurant.name}
              />
            ) : null}

            {openingHours.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold">Hours</h2>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
                  {openingHours.map(([day, hours]) => (
                    <div key={day} className="flex justify-between gap-2">
                      <dt className="font-medium text-slate-700">
                        {DAY_LABELS[day] ?? day}
                      </dt>
                      <dd>{String(hours)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">Menu</h2>
          {menuByCategory.size === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No menu items added yet.
            </p>
          ) : (
            <div className="mt-6 space-y-8">
              {[...menuByCategory.entries()].map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {category}
                  </h3>
                  <div className="mt-3 divide-y divide-slate-100">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.item_name}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-600">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        {item.price !== null ? (
                          <p className="whitespace-nowrap font-semibold text-slate-900">
                            LKR {item.price.toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Reviews</h2>
            {reviewSummary.count > 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <StarRating rating={reviewSummary.average ?? 0} />
                <span>
                  {reviewSummary.average?.toFixed(1)} · {reviewSummary.count}{" "}
                  review{reviewSummary.count === 1 ? "" : "s"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            {user ? (
              <ReviewForm restaurantId={restaurant.id} existingReview={myReview} />
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                <Link
                  href={`/login?next=/restaurants/${restaurant.id}`}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Log in
                </Link>{" "}
                to leave a review.
              </p>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">
              No reviews yet. Be the first.
            </p>
          ) : (
            <div className="mt-6 space-y-4 divide-y divide-slate-100">
              {reviews.map((review) => (
                <div key={review.id} className="pt-4 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <StarRating rating={review.rating} />
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(review.created_at).toLocaleDateString()}
                        {review.customer_id === user?.id ? " · Your review" : ""}
                      </p>
                    </div>
                    {review.customer_id === user?.id ? (
                      <ReviewDeleteButton
                        reviewId={review.id}
                        restaurantId={restaurant.id}
                      />
                    ) : null}
                  </div>
                  {review.review_text ? (
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {review.review_text}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function groupByCategory(items: MenuItem[]): Map<string, MenuItem[]> {
  const grouped = new Map<string, MenuItem[]>();

  for (const item of items) {
    const category = item.category || "Uncategorized";
    const existing = grouped.get(category);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(category, [item]);
    }
  }

  return grouped;
}
