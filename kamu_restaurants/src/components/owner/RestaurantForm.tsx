"use client";

import { useActionState, useState } from "react";
import type { DashboardFormState } from "@/app/dashboard/restaurants/actions";
import type { OwnerStatus } from "@/lib/owner-status";
import { PRICE_RANGES, type WeekHours } from "@/lib/validation/restaurant";
import { OpeningHoursEditor } from "./OpeningHoursEditor";
import { PhotoUploadField } from "./PhotoUploadField";
import { submitWithoutReset } from "./submit-without-reset";

type FormAction = (
  state: DashboardFormState,
  formData: FormData,
) => Promise<DashboardFormState>;

export interface RestaurantFormValues {
  name: string;
  area: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  cuisine_type: string[] | null;
  price_range: string | null;
  vibe_description: string | null;
  cover_photo_url: string | null;
  is_published: boolean;
}

const PRICE_LABELS: Record<(typeof PRICE_RANGES)[number], string> = {
  $: "$ (budget)",
  $$: "$$ (mid-range)",
  $$$: "$$$ (premium)",
};

const initialState: DashboardFormState = {
  error: null,
  notice: null,
  savedAt: null,
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-100";

export function RestaurantForm({
  action,
  restaurant,
  hours,
  ownerId,
  ownerStatus,
  knownAreas,
  submitLabel,
  readOnly = false,
}: {
  action: FormAction;
  restaurant?: RestaurantFormValues;
  hours: WeekHours;
  ownerId: string;
  ownerStatus: OwnerStatus;
  knownAreas: string[];
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [uploading, setUploading] = useState(false);

  return (
    <form
      onSubmit={(event) => submitWithoutReset(event, formAction)}
      className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6"
    >
      <fieldset disabled={readOnly} className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Restaurant name
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={restaurant?.name}
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Area
            <input
              name="area"
              required
              maxLength={80}
              list="known-areas"
              defaultValue={restaurant?.area}
              placeholder="e.g. Nugegoda"
              className={inputClass}
            />
            <datalist id="known-areas">
              {knownAreas.map((area) => (
                <option key={area} value={area} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Pick an existing spelling if yours is listed, so customers
              filtering by area find you.
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Price range
            <select
              name="price_range"
              defaultValue={restaurant?.price_range ?? ""}
              className={inputClass}
            >
              <option value="">Not specified</option>
              {PRICE_RANGES.map((price) => (
                <option key={price} value={price}>
                  {PRICE_LABELS[price]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Address
            <input
              name="address"
              maxLength={200}
              defaultValue={restaurant?.address ?? ""}
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Cuisines
            <input
              name="cuisine_type"
              defaultValue={restaurant?.cuisine_type?.join(", ") ?? ""}
              placeholder="Sri Lankan, Cafe"
              className={inputClass}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Separate with commas, up to 6.
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Latitude
            <input
              name="latitude"
              type="number"
              step="any"
              min={-90}
              max={90}
              defaultValue={restaurant?.latitude ?? ""}
              placeholder="6.9101"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Longitude
            <input
              name="longitude"
              type="number"
              step="any"
              min={-180}
              max={180}
              defaultValue={restaurant?.longitude ?? ""}
              placeholder="79.8571"
              className={inputClass}
            />
          </label>
          <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">
            For the map pin. In Google Maps, right-click your restaurant and
            click the coordinates to copy them.
          </p>
        </section>

        <label className="block text-sm font-medium text-slate-700">
          Vibe description
          <textarea
            name="vibe_description"
            rows={5}
            maxLength={1000}
            defaultValue={restaurant?.vibe_description ?? ""}
            placeholder="Quiet garden cafe with soft lighting; good for reading alone or working through the morning. Popular with university students."
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            This is how customers find you: Kamu matches searches like
            &ldquo;somewhere quiet to read with coffee&rdquo; against it.
            Describe the feel rather than the menu: the noise level, lighting,
            seating, who usually comes, and what it&apos;s good for (a date,
            working alone, a big family lunch). Be honest; it works better.
          </span>
        </label>

        <OpeningHoursEditor initial={hours} disabled={readOnly} />

        <PhotoUploadField
          name="cover_photo_url"
          label="Cover photo"
          ownerId={ownerId}
          defaultUrl={restaurant?.cover_photo_url}
          disabled={readOnly}
          onUploadingChange={setUploading}
        />

        <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={restaurant?.is_published ?? false}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="font-medium text-slate-900">
              Published (show this listing to customers)
            </span>
            <span className="mt-0.5 block text-slate-500">
              {ownerStatus === "pending"
                ? "Your account is still waiting for verification, so customers won't see it until the Kamu team has verified you."
                : "Published listings appear on Kamu straight away. Untick to take it offline at any time."}
            </span>
          </span>
        </label>
      </fieldset>

      {state.error ? (
        <p className="text-sm text-rose-600">{state.error}</p>
      ) : null}
      {state.notice ? (
        <p className="text-sm text-emerald-700">{state.notice}</p>
      ) : null}

      {readOnly ? null : (
        <button
          type="submit"
          disabled={isPending || uploading}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : uploading ? "Waiting for photo…" : submitLabel}
        </button>
      )}
    </form>
  );
}
