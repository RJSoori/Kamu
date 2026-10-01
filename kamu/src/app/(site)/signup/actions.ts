"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRow } from "@/lib/auth/customer";
import { safeRedirectPath } from "@/lib/safe-redirect";

export interface SignupState {
  error: string | null;
  confirmationSent: boolean;
}

export async function signUp(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(String(formData.get("next") ?? ""), "/");

  if (!email || !password) {
    return { error: "Email and password are required.", confirmationSent: false };
  }
  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
      confirmationSent: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message, confirmationSent: false };
  }

  // If the Supabase project requires email confirmation, signUp() succeeds
  // but returns no session -- data.user exists (unconfirmed) while
  // data.session is null. Nothing to redirect to yet in that case.
  if (!data.session || !data.user) {
    return { error: null, confirmationSent: true };
  }

  await ensureCustomerRow(supabase, data.user);

  redirect(next);
}
