import Link from "next/link";
import { signOut } from "@/app/admin/login/actions";

export function AdminNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/admin/restaurants" className="text-lg font-semibold text-slate-900">
          Kamu Admin
        </Link>
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
