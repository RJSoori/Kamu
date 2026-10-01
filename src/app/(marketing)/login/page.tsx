import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasOwnerIntent } from "@/lib/auth/owner";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm, type LoginNotice } from "./LoginForm";
import { OwnerUpgradeForm } from "./OwnerUpgradeForm";

/**
 * Also the one place that sorts out every signed-in state, which is why the
 * dashboard guard and the login action both send people here:
 *   - signed-in owner         -> straight on to `next`
 *   - signed-in, not an owner -> explicit "register as owner" prompt (an
 *     existing customer account, or an owner whose setup didn't finish)
 *   - signed out              -> the login form
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next, "/dashboard");
  const notice: LoginNotice | null =
    params.notice === "confirmed" || params.notice === "confirm_failed"
      ? params.notice
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let content: React.ReactNode;
  if (user) {
    const { data: ownerRow } = await supabase
      .from("restaurant_owners")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (ownerRow) {
      redirect(next);
    }

    content = (
      <OwnerUpgradeForm
        email={user.email ?? ""}
        next={next}
        finishingRegistration={hasOwnerIntent(user)}
        defaultName={(user.user_metadata?.full_name as string | undefined) ?? ""}
        defaultPhone={(user.user_metadata?.phone as string | undefined) ?? ""}
      />
    );
  } else {
    content = <LoginForm next={next} notice={notice} />;
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-50 px-6 py-12">
      {content}
    </div>
  );
}
