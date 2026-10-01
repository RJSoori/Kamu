import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(marketing)/login/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Kamu for Restaurants
        </Link>

        {user ? (
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="font-medium text-slate-600 transition hover:text-slate-900"
            >
              Dashboard
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="font-medium text-slate-600 transition hover:text-slate-900"
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="font-medium text-slate-600 transition hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
