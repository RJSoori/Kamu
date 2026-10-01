import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next, "/dashboard");

  // Already signed in (as an owner or not): /login knows what to do with
  // every signed-in state, including offering an owner upgrade.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-50 px-6 py-12">
      <RegisterForm next={next} />
    </div>
  );
}
