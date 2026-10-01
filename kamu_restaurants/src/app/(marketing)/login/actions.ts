"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnerRow, hasOwnerIntent } from "@/lib/auth/owner";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { normalizePhone } from "@/lib/validation/phone";

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
  const next = safeRedirectPath(String(formData.get("next") ?? ""), "/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error?.code === "email_not_confirmed") {
    return {
      error:
        "Confirm your email first -- open the link we sent you when you registered.",
    };
  }
  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const { data: ownerRow, error: lookupError } = await supabase
    .from("restaurant_owners")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (lookupError) {
    return { error: "Something went wrong signing you in. Please try again." };
  }

  if (!ownerRow) {
    // Registered here, but email confirmation meant there was no session to
    // create the owner row with at sign-up time. Finish it now.
    if (hasOwnerIntent(data.user)) {
      const { error: setupError } = await ensureOwnerRow(supabase, data.user);
      if (setupError) {
        return { error: setupError };
      }
    } else {
      // A Kamu account that never registered as an owner (auth.users is
      // shared with the customer app). Don't enroll it silently -- the
      // login page shows an explicit "register this account as an owner?"
      // prompt for a signed-in non-owner. See src/lib/auth/guard.ts.
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
  }

  redirect(next);
}

export interface UpgradeState {
  error: string | null;
}

/**
 * The explicit opt-in from that prompt: turns the signed-in account (e.g.
 * an existing customer account) into a restaurant owner account, which then
 * starts pending admin verification like any other registration.
 */
export async function upgradeToOwner(
  _prevState: UpgradeState,
  formData: FormData,
): Promise<UpgradeState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const next = safeRedirectPath(String(formData.get("next") ?? ""), "/dashboard");

  if (!phone) {
    return {
      error: "Enter a phone number we can reach you on, e.g. 077 123 4567.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Please log in again." };
  }

  const { error } = await ensureOwnerRow(supabase, user, {
    displayName,
    phone,
  });
  if (error) {
    return { error };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
