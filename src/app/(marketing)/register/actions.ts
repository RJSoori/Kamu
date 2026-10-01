"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnerRow } from "@/lib/auth/owner";

export interface RegisterState {
  error: string | null;
  confirmationSent: boolean;
}

function sanitizeNext(nextParam: string): string {
  return nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/dashboard";
}

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const next = sanitizeNext(String(formData.get("next") ?? "/dashboard"));

  if (!email || !password) {
    return {
      error: "Email and password are required.",
      confirmationSent: false,
    };
  }
  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
      confirmationSent: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { full_name: displayName } } : undefined,
  });

  if (error) {
    return { error: error.message, confirmationSent: false };
  }

  // If the Supabase project requires email confirmation, signUp() succeeds
  // but returns no session yet -- nothing to redirect to, and no session to
  // create the restaurant_owners row with (its insert policy needs
  // auth.uid() = id, which requires an authenticated session).
  if (!data.session || !data.user) {
    return { error: null, confirmationSent: true };
  }

  await ensureOwnerRow(supabase, data.user);

  redirect(next);
}
