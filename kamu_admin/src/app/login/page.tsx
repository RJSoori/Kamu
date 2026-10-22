import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next, "/");

  // The protected layout sends signed-in non-admins here too; without this
  // they'd just see the same empty form again with no reason.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) {
      redirect(next);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6">
      {user ? (
        <p className="w-full max-w-sm rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          You&apos;re signed in as {user.email}, but that account isn&apos;t an
          admin. Sign in with an admin account, or ask an existing admin to add
          you to <code>admin_users</code>.
        </p>
      ) : null}
      <LoginForm next={next} />
    </div>
  );
}
