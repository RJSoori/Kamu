import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/owner/DashboardNav";
import { UnauthorizedError, requireOwner } from "@/lib/auth/guard";

/**
 * Everything under /dashboard is protected. Unlike kamu's admin panel,
 * /login and /register live outside this whole subtree (top-level, under
 * the (marketing) route group) rather than nested inside it, so there's no
 * need for the "keep /admin/login outside the guard" route-group trick --
 * this layout can guard unconditionally.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireOwner();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login?next=/dashboard");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
