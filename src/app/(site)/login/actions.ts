"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRow } from "@/lib/auth/customer";

export interface LoginState {
  error: string | null;
}

function sanitizeNext(nextParam: string): string {
  // Only ever redirect within the app -- an unvalidated `next` value is an
  // open-redirect vector.
  return nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/";
}

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNext(String(formData.get("next") ?? "/"));

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
