import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-50 px-6">
      <div className="max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">
          List your restaurant on Kamu
        </h1>
        <p className="text-slate-600">
          Register your restaurant, manage your menu and details, and reach
          people searching Kamu by mood and craving.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Register your restaurant
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
