import type { ListingState } from "@/lib/owner-status";

const STYLES: Record<ListingState, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-100 text-emerald-800" },
  awaiting_verification: {
    label: "Waiting for verification",
    className: "bg-amber-100 text-amber-800",
  },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  hidden_by_admin: {
    label: "Hidden by Kamu",
    className: "bg-rose-100 text-rose-800",
  },
  offline: { label: "Offline", className: "bg-slate-100 text-slate-700" },
};

export function ListingStateBadge({ state }: { state: ListingState }) {
  const { label, className } = STYLES[state];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
