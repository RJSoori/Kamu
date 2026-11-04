import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutCustomer } from "@/app/(site)/login/actions";
import { HeaderSearch } from "@/components/site/HeaderSearch";

const NAV_LINK =
  "rounded-full px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-slate-900">
          <KamuMark />
          <span className="font-serif text-2xl font-semibold tracking-tight">
            Kamu
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <HeaderSearch />
          <Link href="/ask" className={`${NAV_LINK} flex items-center gap-1.5`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-cinnamon-600" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2l1.8 5.5L19 9.3l-5.2 1.8L12 16.5l-1.8-5.4L5 9.3l5.2-1.8L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z"
              />
            </svg>
            Ask<span className="hidden sm:inline"> Kamu</span>
          </Link>
          {user ? (
            <>
              <Link href="/bucket-list" className={NAV_LINK}>
                Bucket list
              </Link>
              <span
                className="hidden max-w-48 truncate px-3 text-slate-500 lg:inline"
                title={user.email}
              >
                {user.email}
              </span>
              <form action={signOutCustomer}>
                <button type="submit" className={NAV_LINK}>
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={NAV_LINK}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="ml-1 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/** A leaf resting on a bowl: food, calm, Sri Lankan tea country. */
function KamuMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <circle cx="16" cy="16" r="16" className="fill-slate-900" />
      <path
        d="M8 17h16a8 8 0 0 1-16 0Z"
        className="fill-mango-400"
      />
      <path
        d="M16.5 15c-.5-4 1.5-7.5 5.5-8.5.5 4-1.5 7.5-5.5 8.5Z"
        fill="#9fcf9a"
      />
    </svg>
  );
}
