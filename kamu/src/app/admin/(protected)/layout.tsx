import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { UnauthorizedError, requireAdmin } from "@/lib/admin/guard";

/**
 * Deliberately kept OUTSIDE this layout: src/app/admin/login. Route groups
 * (this folder's parentheses) don't affect the URL, but they do let
 * /admin/login render without this guard -- nesting the guard directly in
 * src/app/admin/layout.tsx would wrap the login page too and redirect-loop
 * an unauthenticated visitor between /admin/login and itself.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/admin/login");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
