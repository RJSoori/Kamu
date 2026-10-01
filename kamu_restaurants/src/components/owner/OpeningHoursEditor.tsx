"use client";

import { useState } from "react";
import {
  DAYS,
  type DayHours,
  type DayKey,
  type WeekHours,
} from "@/lib/validation/restaurant";

/**
 * Seven rows of open/close times instead of the admin panel's raw JSON
 * textarea. Submits hours.<day>.open|close|closed, parsed server-side by
 * parseOpeningHours().
 */
export function OpeningHoursEditor({
  initial,
  disabled,
}: {
  initial: WeekHours;
  disabled?: boolean;
}) {
  const [week, setWeek] = useState<WeekHours>(initial);

  function update(day: DayKey, patch: Partial<DayHours>) {
    setWeek((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
  }

  function copyMondayToEveryDay() {
    setWeek((current) => {
      const next = { ...current };
      for (const { key } of DAYS) {
        next[key] = { ...current.mon };
      }
      return next;
    });
  }

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-700">
        Opening hours
      </legend>
      <p className="text-xs text-slate-500">
        Leave a day empty if you&apos;re not sure. Closing after midnight is
        fine (e.g. 18:00 to 02:00).
      </p>

      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const day = week[key];
          return (
            <div
              key={key}
              className="grid grid-cols-[6.5rem_1fr_auto_1fr_auto] items-center gap-2 text-sm"
            >
              <span className="text-slate-700">{label}</span>
              <input
                type="time"
                name={`hours.${key}.open`}
                aria-label={`${label} opening time`}
                value={day.open}
                disabled={day.closed}
                onChange={(event) => update(key, { open: event.target.value })}
                className="rounded-xl border border-slate-300 px-2 py-1.5 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="text-slate-400">to</span>
              <input
                type="time"
                name={`hours.${key}.close`}
                aria-label={`${label} closing time`}
                value={day.close}
                disabled={day.closed}
                onChange={(event) => update(key, { close: event.target.value })}
                className="rounded-xl border border-slate-300 px-2 py-1.5 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <label className="flex items-center gap-1.5 text-slate-600">
                <input
                  type="checkbox"
                  name={`hours.${key}.closed`}
                  checked={day.closed}
                  onChange={(event) => update(key, { closed: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Closed
              </label>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={copyMondayToEveryDay}
        className="text-sm font-medium text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
      >
        Copy Monday to every day
      </button>
    </fieldset>
  );
}
