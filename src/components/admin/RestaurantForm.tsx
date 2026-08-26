import type { Restaurant } from "@/lib/data/restaurants";

type FormAction = (formData: FormData) => void | Promise<void>;

export function RestaurantForm({
  restaurant,
  action,
  submitLabel,
}: {
  restaurant?: Restaurant;
  action: FormAction;
  submitLabel: string;
}) {
  return (
    <form
      action={action}
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={restaurant?.name} required />
        <Field label="Area" name="area" defaultValue={restaurant?.area} required />
        <Field
          label="Address"
          name="address"
          defaultValue={restaurant?.address ?? ""}
        />
        <Field
          label="Price range"
          name="price_range"
          defaultValue={restaurant?.price_range ?? ""}
          placeholder="$ / $$ / $$$"
        />
        <Field
          label="Latitude"
          name="latitude"
          type="number"
          step="any"
          defaultValue={restaurant?.latitude ?? ""}
        />
        <Field
          label="Longitude"
          name="longitude"
          type="number"
          step="any"
          defaultValue={restaurant?.longitude ?? ""}
        />
        <Field
          label="Cuisine types (comma separated)"
          name="cuisine_type"
          defaultValue={restaurant?.cuisine_type?.join(", ") ?? ""}
          className="sm:col-span-2"
        />
        <Field
          label="Cover photo URL"
          name="cover_photo_url"
          defaultValue={restaurant?.cover_photo_url ?? ""}
          className="sm:col-span-2"
        />
      </div>

      <TextArea
        label="Vibe description"
        name="vibe_description"
        defaultValue={restaurant?.vibe_description ?? ""}
        rows={4}
        placeholder="Laid-back rooftop cafe, great sunset views, quiet mornings, popular with students, affordable coffee"
      />

      <TextArea
        label="Opening hours (JSON)"
        name="opening_hours"
        defaultValue={
          restaurant?.opening_hours
            ? JSON.stringify(restaurant.opening_hours, null, 2)
            : ""
        }
        rows={4}
        placeholder='{"mon": "8:00-20:00"}'
      />

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={restaurant?.is_published ?? false}
          className="h-4 w-4 rounded border-slate-300"
        />
        Published (visible to customers)
      </label>

      <button
        type="submit"
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  step,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  step?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className ?? ""}`}>
      {label}
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
      />
    </label>
  );
}
