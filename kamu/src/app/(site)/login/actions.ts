"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRow } from "@/lib/auth/customer";
import { safeRedirectPath } from "@/lib/safe-redirect";

export interface LoginState {
  error: string | null;
}

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Only ever redirect within the app -- an unvalidated `next` value is an
  // open-redirect vector.
  const next = safeRedirectPath(String(formData.get("next") ?? ""), "/");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  await ensureCustomerRow(supabase, data.user);

  redirect(next);
}

export async function signOutCustomer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
