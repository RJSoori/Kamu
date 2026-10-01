import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutCustomer } from "@/app/(site)/login/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            Kamu
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/bucket-list"
              className="font-medium text-slate-600 transition hover:text-slate-900"
            >
              Bucket list
            </Link>
            <span className="text-slate-600">{user.email}</span>
            <form action={signOutCustomer}>
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
              href="/signup"
              className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
