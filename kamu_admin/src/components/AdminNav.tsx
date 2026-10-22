import Link from "next/link";
import { signOut } from "@/app/login/actions";

const LINKS = [
  { href: "/restaurants", label: "Restaurants" },
  { href: "/owners", label: "Owners" },
  { href: "/reports", label: "Reports" },
  { href: "/stats", label: "Stats" },
];

export function AdminNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/restaurants" className="text-lg font-semibold text-slate-900">
            Kamu Admin
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-slate-900">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
