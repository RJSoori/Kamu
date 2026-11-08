import Image from "next/image";
import Link from "next/link";

// Soft, food-toned washes for restaurants without a photo (most, for now).
const PLACEHOLDER_TONES = [
  "from-[#dcebd6] to-[#b9d6b0]", // tea leaf
  "from-[#fbe7c6] to-[#f4c98a]", // mango
  "from-[#f6dccf] to-[#e8b49a]", // cinnamon
  "from-[#dbe9ec] to-[#b4d2d8]", // lagoon
  "from-[#efe4d2] to-[#dcc8a6]", // coconut husk
];

export const PRICE_LABELS: Record<string, string> = {
  $: "Budget",
  $$: "Mid-range",
  $$$: "Splurge",
};

export interface RestaurantCardData {
  id: string;
  name: string;
  area: string | null;
  cuisine_type?: string[] | null;
  price_range?: string | null;
  vibe_description?: string | null;
  cover_photo_url?: string | null;
}

/**
 * The one restaurant card used by home, /ask and the bucket list.
 * `children` goes at the bottom for page-specific extras (match evidence,
 * saved date).
 */
export function RestaurantCard({
  restaurant,
  children,
}: {
  restaurant: RestaurantCardData;
  children?: React.ReactNode;
}) {
  const cuisines = restaurant.cuisine_type ?? [];

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/10"
    >
      <div className="relative h-40 overflow-hidden">
        {restaurant.cover_photo_url ? (
          <Image
            src={restaurant.cover_photo_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <PhotoPlaceholder id={restaurant.id} name={restaurant.name} />
        )}
        {restaurant.price_range ? (
          <span
            className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
            title={PRICE_LABELS[restaurant.price_range]}
          >
            {restaurant.price_range}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {restaurant.area || "Sri Lanka"}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900 group-hover:text-slate-800">
          {restaurant.name}
        </h3>
        {restaurant.vibe_description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {restaurant.vibe_description}
          </p>
        ) : null}
        {cuisines.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {cuisines.slice(0, 3).map((cuisine) => (
              <span
                key={cuisine}
                className="rounded-full bg-mango-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {cuisine}
              </span>
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </Link>
  );
}

export function PhotoPlaceholder({ id, name }: { id: string; name: string }) {
  // Stable per restaurant, so a card keeps its colour between visits.
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const tone = PLACEHOLDER_TONES[hash % PLACEHOLDER_TONES.length];

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-linear-to-br ${tone}`}
    >
      <span
        aria-hidden="true"
        className="font-serif text-6xl font-semibold text-white/80 drop-shadow-sm transition duration-500 group-hover:scale-110"
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
