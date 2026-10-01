import Link from "next/link";

/**
 * Plain GET form -- no client-side JS needed. Submitting re-requests the
 * page with ?area=&cuisine= search params, which page.tsx reads server-side
 * to filter the query. Options come from getRestaurantFilterOptions(), so a
 * combination that would return zero rows is never offered.
 */
export function RestaurantFilters({
  areas,
  cuisines,
  selectedArea,
  selectedCuisine,
}: {
  areas: string[];
  cuisines: string[];
  selectedArea?: string;
  selectedCuisine?: string;
}) {
  const hasFilters = Boolean(selectedArea || selectedCuisine);

  return (
    <form className="flex flex-wrap items-end gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <SelectField
        label="Area"
        name="area"
        defaultValue={selectedArea ?? ""}
        options={areas}
      />
      <SelectField
        label="Cuisine"
        name="cuisine"
        defaultValue={selectedCuisine ?? ""}
        options={cuisines}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Apply filters
        </button>
        {hasFilters ? (
          <Link
            href="/"
            className="flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 block w-48 rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
