"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// These pages already have the big search box.
const PAGES_WITH_SEARCH = ["/", "/search"];

/**
 * Search from any page: a small box in the header on wider screens, and on
 * phones (too narrow for a box) an icon that jumps to the home page's search
 * box with the cursor in it. Plain GET form, same as MoodSearchForm.
 */
export function HeaderSearch() {
  const pathname = usePathname();
  if (PAGES_WITH_SEARCH.includes(pathname)) return null;

  return (
    <>
      <form action="/search" className="relative hidden md:block">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          name="q"
          // Same cap as the mood-search Edge Function.
          maxLength={300}
          placeholder="Search by mood…"
          aria-label="Search by mood"
          required
          className="w-60 rounded-full border border-slate-200 bg-white/80 py-2 pl-9 pr-4 text-sm text-slate-900 transition placeholder:text-slate-400 focus:w-72 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/70"
        />
      </form>
      <Link
        href="/?focus=search#mood-search"
        aria-label="Search by mood"
        className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
      >
        <SearchIcon className="h-5 w-5" />
      </Link>
    </>
  );
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
