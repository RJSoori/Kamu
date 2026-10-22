import Link from "next/link";
import { OWNER_STATUSES, type OwnerStatus } from "@/lib/admin/owner-status";
import { createClient } from "@/lib/supabase/server";
import { setOwnerStatusAction } from "./actions";

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status: OwnerStatus = OWNER_STATUSES.includes(statusParam as OwnerStatus)
    ? (statusParam as OwnerStatus)
    : "pending";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_owners")
    .select(
      "id, email, display_name, phone, status_note, created_at, restaurants(id, name, area, is_published)",
    )
    .eq("status", status)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  const owners = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Restaurant owners</h1>

      <nav className="flex gap-2">
        {OWNER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/owners?status=${s}`}
            className={
              s === status
                ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold capitalize text-white"
                : "rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium capitalize text-slate-700 hover:bg-slate-50"
            }
          >
            {s}
          </Link>
        ))}
      </nav>

      <ul className="space-y-4">
        {owners.map((owner) => (
          <li
            key={owner.id}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {owner.display_name || owner.email}
                </p>
                <p className="text-sm text-slate-600">
                  {owner.email}
                  {owner.phone ? ` · ${owner.phone}` : ""}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Registered {new Date(owner.created_at).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Their listings
              </p>
              {owner.restaurants.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">Nothing drafted yet.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {owner.restaurants.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/restaurants/${r.id}/edit`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="text-slate-500">
                        {" "}
                        · {r.area} · {r.is_published ? "published" : "draft"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {owner.status_note ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                Note shown to owner: {owner.status_note}
              </p>
            ) : null}

            <form className="space-y-2">
              <textarea
                name="status_note"
                required
                rows={2}
                placeholder="Note for the owner (required to reject or suspend)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
              <div className="flex flex-wrap gap-2">
                {status !== "approved" ? (
                  <button
                    // Approving needs no note, so skip the textarea's `required`.
                    formNoValidate
                    formAction={setOwnerStatusAction.bind(null, owner.id, "approved")}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                ) : null}
                {status === "pending" ? (
                  <button
                    formAction={setOwnerStatusAction.bind(null, owner.id, "rejected")}
                    className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reject
                  </button>
                ) : null}
                {status === "approved" ? (
                  <button
                    formAction={setOwnerStatusAction.bind(null, owner.id, "suspended")}
                    className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Suspend
                  </button>
                ) : null}
              </div>
            </form>
          </li>
        ))}
        {owners.length === 0 ? (
          <p className="text-sm text-slate-500">No {status} owners.</p>
        ) : null}
      </ul>
    </div>
  );
}
