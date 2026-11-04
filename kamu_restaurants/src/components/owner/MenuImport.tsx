"use client";

import { useActionState, useState } from "react";
import {
  readMenuPhotoAction,
  saveImportedMenuAction,
  type MenuReadState,
  type MenuSaveState,
} from "@/app/dashboard/restaurants/ai-actions";
import type { ImportedMenuItem } from "@/lib/data/ai-help";
import { formatLkr } from "@/lib/format";
import { PhotoUploadField } from "./PhotoUploadField";
import { submitWithoutReset } from "./submit-without-reset";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900";

/**
 * "Add dishes from a photo": the owner uploads a photo of their paper menu,
 * the menu-import function reads it, and the owner ticks what to save.
 * Nothing is saved until they click "Add ticked dishes".
 */
export function MenuImport({ restaurantId, ownerId }: { restaurantId: string; ownerId: string }) {
  // Bumped to start over with a new photo.
  const [round, setRound] = useState(0);
  return <MenuImportRound key={round} restaurantId={restaurantId} ownerId={ownerId} onRestart={() => setRound((r) => r + 1)} />;
}

function MenuImportRound({
  restaurantId,
  ownerId,
  onRestart,
}: {
  restaurantId: string;
  ownerId: string;
  onRestart: () => void;
}) {
  const [read, readAction, reading] = useActionState(
    readMenuPhotoAction.bind(null, restaurantId),
    { error: null, items: null } as MenuReadState,
  );
  const [saved, saveAction, saving] = useActionState(
    saveImportedMenuAction.bind(null, restaurantId),
    { error: null, notice: null } as MenuSaveState,
  );
  const [uploading, setUploading] = useState(false);

  if (saved.notice) {
    return (
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-emerald-700">{saved.notice}</p>
        <button type="button" onClick={onRestart} className="font-medium text-slate-900 hover:underline">
          Read another photo
        </button>
      </div>
    );
  }

  if (read.items) {
    const toReview = read.items.filter((item) => item.status !== "unchanged");
    const unchanged = read.items.length - toReview.length;
    return (
      <form onSubmit={(event) => submitWithoutReset(event, saveAction)} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Here&apos;s what we read. Check names and prices against your menu, untick anything wrong,
          then add.
          {unchanged > 0 ? ` ${unchanged} dish${unchanged === 1 ? " is" : "es are"} already on your menu with the same price.` : ""}
        </p>
        {toReview.length === 0 ? (
          <p className="text-sm text-slate-900">Nothing new: your menu already matches this photo.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {toReview.map((item, i) => (
              <ReviewRow key={i} index={i} item={item} />
            ))}
          </ul>
        )}
        {saved.error ? <p className="text-sm text-rose-600">{saved.error}</p> : null}
        <div className="flex gap-4">
          {toReview.length > 0 ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add ticked dishes"}
            </button>
          ) : null}
          <button type="button" onClick={onRestart} className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Start over
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => submitWithoutReset(event, readAction)} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-600">
        Have a printed menu? Upload a clear photo and Kamu will copy the dishes and prices for you
        to check. Up to 10 photos a day.
      </p>
      <PhotoUploadField
        name="menu_photo_url"
        label="Photo of your menu"
        ownerId={ownerId}
        onUploadingChange={setUploading}
      />
      {read.error ? <p className="text-sm text-rose-600">{read.error}</p> : null}
      <button
        type="submit"
        disabled={reading || uploading}
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {reading ? "Reading your menu (up to a minute)…" : "Read menu"}
      </button>
    </form>
  );
}

function ReviewRow({ index, item }: { index: number; item: ImportedMenuItem }) {
  const name = (field: string) => `items.${index}.${field}`;

  if (item.status === "price_change") {
    return (
      <li className="flex items-center gap-3 py-3 text-sm">
        <input type="checkbox" name={name("include")} defaultChecked aria-label={`Update ${item.item_name}`} />
        <input type="hidden" name={name("existing_id")} value={item.existing_id} />
        <input type="hidden" name={name("item_name")} value={item.item_name} />
        <input type="hidden" name={name("price")} value={item.price ?? ""} />
        <span className="font-medium text-slate-900">{item.item_name}</span>
        <span className="text-slate-600">
          price {item.old_price != null ? formatLkr(item.old_price) : "not set"} →{" "}
          {item.price != null ? formatLkr(item.price) : ""}
        </span>
      </li>
    );
  }

  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[auto_2fr_1fr_1fr]">
      <input type="checkbox" name={name("include")} defaultChecked aria-label={`Add ${item.item_name}`} className="mt-2" />
      <input name={name("item_name")} defaultValue={item.item_name} aria-label="Dish name" className={inputClass} />
      <input name={name("price")} type="number" min={0} step="any" defaultValue={item.price ?? ""} aria-label="Price (LKR)" placeholder="Price" className={inputClass} />
      <input name={name("category")} defaultValue={item.category ?? ""} aria-label="Category" placeholder="Category" className={inputClass} />
      <input name={name("description")} defaultValue={item.description ?? ""} aria-label="Description" placeholder="Description (optional)" className={`${inputClass} sm:col-start-2 sm:col-span-3`} />
    </li>
  );
}
