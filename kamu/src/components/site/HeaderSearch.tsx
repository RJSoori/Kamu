"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SparkleIcon } from "./AskKamuForm";

// These pages already have the big Ask Kamu box.
const PAGES_WITH_SEARCH = ["/", "/ask"];

/**
 * Ask Kamu from any page: a small box in the header on wider screens, and on
 * phones (too narrow for a box) a button to /ask. Plain GET form, same as
 * AskKamuForm.
 */
export function HeaderSearch() {
  const pathname = usePathname();
  if (PAGES_WITH_SEARCH.includes(pathname)) return null;

  return (
    <>
      <form action="/ask" className="relative hidden md:block">
        <SparkleIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinnamon-600" />
        <input
          type="text"
          name="q"
          // Same cap as the ask-kamu Edge Function.
          maxLength={500}
          placeholder="Ask Kamu…"
          aria-label="Ask Kamu"
          required
          className="w-60 rounded-full border border-slate-200 bg-white/80 py-2 pl-9 pr-4 text-sm text-slate-900 transition placeholder:text-slate-400 focus:w-72 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/70"
        />
      </form>
      <Link
        href="/ask"
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
      >
        <SparkleIcon className="h-4 w-4 text-cinnamon-600" />
        Ask
      </Link>
    </>
  );
}
