import Link from "next/link";
import { HiddenBadge, HideControl } from "@/components/HideControl";
import { createClient } from "@/lib/supabase/server";
import { setOwnerStatusAction } from "../owners/actions";
import { setRestaurantHiddenAction } from "../restaurants/actions";
import { setMenuItemHiddenAction } from "../restaurants/[id]/menu-items/actions";
import { setReportStatusAction } from "./actions";

interface ReportRow {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    owner_id: string | null;
    hidden_by_admin: boolean;
  };
  menu_item: { id: string; item_name: string; hidden_by_admin: boolean } | null;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const closed = view === "closed";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_reports")
    .select(
      `id, reason, details, status, admin_notes, created_at,
       restaurant:restaurants(id, name, owner_id, hidden_by_admin),
       menu_item:menu_items(id, item_name, hidden_by_admin)`,
    )
    .in("status", closed ? ["resolved", "dismissed"] : ["open", "reviewing"])
    .order("created_at", { ascending: false })
    // Closed history only grows, so show the latest 200. (The open queue
    // still hits Supabase's 1,000-row cap, far beyond expected volume.)
    .limit(closed ? 200 : 1000);

  if (error) {
    throw new Error(error.message);
  }
  const reports = (data ?? []) as unknown as ReportRow[];

  // Most-reported restaurants among the open queue, to spot bad actors.
  const counts = new Map<string, { name: string; count: number }>();
  if (!closed) {
    for (const r of reports) {
      const entry = counts.get(r.restaurant.id) ?? { name: r.restaurant.name, count: 0 };
      entry.count += 1;
      counts.set(r.restaurant.id, entry);
    }
  }
  const mostReported = [...counts.entries()]
    .filter(([, e]) => e.count > 1)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      <nav className="flex gap-2">
        {[
          { label: "Open", href: "/reports", active: !closed },
          { label: "Closed", href: "/reports?view=closed", active: closed },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={
              tab.active
                ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {mostReported.length > 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Reported more than once</p>
          <ul className="mt-1">
            {mostReported.map(([id, e]) => (
              <li key={id}>
                {e.name}: {e.count} open reports
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="space-y-4">
        {reports.map((report) => {
          const { restaurant, menu_item: item } = report;
          return (
            <li
              key={report.id}
              className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                  {report.reason}
                </span>
                <span className="text-xs capitalize text-slate-500">{report.status}</span>
                <span className="text-xs text-slate-400">
                  {new Date(report.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <Link
                    href={
                      item
                        ? `/restaurants/${restaurant.id}/menu-items`
                        : `/restaurants/${restaurant.id}/edit`
                    }
                    className="hover:underline"
                  >
                    {item ? `${item.item_name} (at ${restaurant.name})` : restaurant.name}
                  </Link>
                  {(item ?? restaurant).hidden_by_admin ? <HiddenBadge /> : null}
                </p>
                <div className="flex gap-4 text-sm">
                  {item ? (
                    <HideControl
                      hidden={item.hidden_by_admin}
                      hideAction={setMenuItemHiddenAction.bind(null, item.id, restaurant.id, true)}
                      unhideAction={setMenuItemHiddenAction.bind(null, item.id, restaurant.id, false)}
                    />
                  ) : (
                    <HideControl
                      hidden={restaurant.hidden_by_admin}
                      hideAction={setRestaurantHiddenAction.bind(null, restaurant.id, true)}
                      unhideAction={setRestaurantHiddenAction.bind(null, restaurant.id, false)}
                    />
                  )}
                  {restaurant.owner_id ? (
                    <details className="relative">
                      <summary className="cursor-pointer font-medium text-rose-600 hover:text-rose-700">
                        Suspend owner
                      </summary>
                      <form
                        action={setOwnerStatusAction.bind(null, restaurant.owner_id, "suspended")}
                        className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
                      >
                        <textarea
                          name="status_note"
                          required
                          rows={3}
                          placeholder="Note for the owner"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
                        >
                          Suspend everything they own
                        </button>
                      </form>
                    </details>
                  ) : null}
                </div>
              </div>

              {report.details ? (
                <p className="whitespace-pre-line text-sm text-slate-700">{report.details}</p>
              ) : null}

              {closed ? (
                report.admin_notes ? (
                  <p className="border-t border-slate-100 pt-3 text-sm text-slate-500">
                    Notes: {report.admin_notes}
                  </p>
                ) : null
              ) : (
                <form className="space-y-2 border-t border-slate-100 pt-3">
                  <textarea
                    name="admin_notes"
                    rows={2}
                    defaultValue={report.admin_notes ?? ""}
                    placeholder="Internal notes (admins only)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...(report.status === "open" ? [{ to: "reviewing", label: "Start reviewing" }] : []),
                      { to: "resolved", label: "Resolve" },
                      { to: "dismissed", label: "Dismiss" },
                    ].map((b) => (
                      <button
                        key={b.to}
                        formAction={setReportStatusAction.bind(null, report.id, b.to)}
                        className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </form>
              )}
            </li>
          );
        })}
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">
            {closed ? "No closed reports." : "Nothing to review. Nice."}
          </p>
        ) : null}
      </ul>
    </div>
  );
}
