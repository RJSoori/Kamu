"use client";

import { useActionState, useState } from "react";
import type { DashboardFormState } from "@/app/dashboard/restaurants/actions";
import { SUGGESTED_MENU_CATEGORIES } from "@/lib/validation/restaurant";
import { PhotoUploadField } from "./PhotoUploadField";
import { submitWithoutReset } from "./submit-without-reset";

type FormAction = (
  state: DashboardFormState,
  formData: FormData,
) => Promise<DashboardFormState>;

export interface MenuItemFormValues {
  item_name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  photo_url: string | null;
}

const initialState: DashboardFormState = {
  error: null,
  notice: null,
  savedAt: null,
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900";

export function MenuItemForm({
  action,
  item,
  ownerId,
  categories,
  submitLabel,
}: {
  action: FormAction;
  item?: MenuItemFormValues;
  ownerId: string;
  /** Categories already used on this menu, offered before the defaults. */
  categories: string[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [uploading, setUploading] = useState(false);
  const categoryOptions = [...new Set([...categories, ...SUGGESTED_MENU_CATEGORIES])];

  return (
    // Re-keyed after each successful save so the "add item" form (and its
    // photo field's internal state) comes back empty for the next item.
    <form
      key={state.savedAt ?? "initial"}
      onSubmit={(event) => submitWithoutReset(event, formAction)}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Item name
          <input
            name="item_name"
            required
            maxLength={120}
            defaultValue={item?.item_name}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Category
          <input
            name="category"
            maxLength={40}
            list="menu-categories"
            defaultValue={item?.category ?? ""}
            placeholder="Mains"
            className={inputClass}
          />
          <datalist id="menu-categories">
            {categoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Price (LKR)
          <input
            name="price"
            type="number"
            min={0}
            step="any"
            defaultValue={item?.price ?? ""}
            placeholder="1250"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Description
          <textarea
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={item?.description ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <PhotoUploadField
        name="photo_url"
        label="Photo (optional)"
        ownerId={ownerId}
        defaultUrl={item?.photo_url}
        onUploadingChange={setUploading}
      />

      {state.error ? (
        <p className="text-sm text-rose-600">{state.error}</p>
      ) : null}
      {state.notice ? (
        <p className="text-sm text-emerald-700">{state.notice}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || uploading}
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : uploading ? "Waiting for photo…" : submitLabel}
      </button>
    </form>
  );
}
