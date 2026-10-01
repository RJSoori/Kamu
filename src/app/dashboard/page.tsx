/**
 * Placeholder dashboard shell -- the "add/edit your restaurant" forms are
 * the next phase (see README.md). This just proves the protected route,
 * nav, and sign-out work end to end.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Your restaurants
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          You haven&apos;t added a restaurant yet.
        </p>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">
          Adding and managing your restaurant listing is coming soon.
        </p>
      </div>
    </div>
  );
}
