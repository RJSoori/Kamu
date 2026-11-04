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
import {
  PhotoPlaceholder,
  PRICE_LABELS,
} from "@/components/site/RestaurantCard";
import { ReportButton } from "@/components/site/ReportButton";

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
  const dayOrder = Object.keys(DAY_LABELS);
  const openingHours = Object.entries(restaurant.opening_hours ?? {}).sort(
    ([a], [b]) => dayOrder.indexOf(a) - dayOrder.indexOf(b),
  );
  const reviewSummary = summarizeReviews(reviews);

  return (
    <main className="px-6 pb-16 pt-8 text-slate-900">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          ← All restaurants
        </Link>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 shadow-lg shadow-slate-900/5">
          {restaurant.cover_photo_url ? (
            <Image
              src={restaurant.cover_photo_url}
              alt={`${restaurant.name} cover`}
              width={1024}
              height={320}
              className="h-72 w-full object-cover"
            />
          ) : (
            <div className="h-48">
              <PhotoPlaceholder id={restaurant.id} name={restaurant.name} />
            </div>
          )}

          <div className="space-y-6 p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cinnamon-600">
                  {restaurant.area || "Unknown area"}
                </p>
                <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">
                  {restaurant.name}
                </h1>
                {restaurant.address ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {restaurant.address}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-3">
                {restaurant.price_range ? (
                  <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    {restaurant.price_range}
                    {PRICE_LABELS[restaurant.price_range] ? (
                      <span className="font-normal text-slate-500">
                        {" "}
                        · {PRICE_LABELS[restaurant.price_range]}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {user ? (
                  <>
                    <SaveButton restaurantId={restaurant.id} initiallySaved={saved} />
                    <ReportButton restaurantId={restaurant.id} />
                  </>
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
                    className="rounded-full bg-mango-100 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            ) : null}

            {restaurant.vibe_description ? (
              <p className="border-l-4 border-mango-400 pl-4 font-serif text-lg leading-8 text-slate-700">
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
                <h2 className="text-xl font-semibold">Opening hours</h2>
                <dl className="mt-3 grid gap-x-8 gap-y-1.5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
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

        <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-sm shadow-slate-900/5">
          <h2 className="text-3xl font-semibold">Menu</h2>
          {menuByCategory.size === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No menu items added yet.
            </p>
          ) : (
            <div className="mt-6 space-y-8">
              {[...menuByCategory.entries()].map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-cinnamon-600">
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
                          {user ? (
                            <div className="mt-1">
                              <ReportButton
                                restaurantId={restaurant.id}
                                menuItemId={item.id}
                              />
                            </div>
                          ) : null}
                        </div>
                        {item.price !== null ? (
                          <p className="whitespace-nowrap rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900">
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

        <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-semibold">Reviews</h2>
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
            <div className="mt-6 space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-2xl bg-slate-50 p-4">
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
