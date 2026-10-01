"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

function sanitizeNext(nextParam: string): string {
  // Only ever redirect within the app -- an unvalidated `next` value is an
  // open-redirect vector.
  return nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/dashboard";
}

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNext(String(formData.get("next") ?? "/dashboard"));

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

  // Deliberately NOT auto-creating a restaurant_owners row here (contrast
  // with kamu's customer login, which calls ensureCustomerRow on every
  // sign-in). auth.users is shared with the customer-facing app, so a valid
  // login alone doesn't mean this account registered as an owner -- someone
  // typing their customer-site credentials in here should be rejected, not
  // silently enrolled as an owner. See src/lib/auth/guard.ts.
  const { data: ownerRow } = await supabase
    .from("restaurant_owners")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!ownerRow) {
    await supabase.auth.signOut();
    return {
      error:
        "This account isn't registered as a restaurant owner yet. Register first.",
    };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
