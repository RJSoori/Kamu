"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnerRow, OWNER_ACCOUNT_TYPE } from "@/lib/auth/owner";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { normalizePhone } from "@/lib/validation/phone";

export interface RegisterState {
  error: string | null;
  confirmationSent: boolean;
}

const EXISTING_ACCOUNT_MESSAGE =
  "There's already a Kamu account with this email (for example, a customer account). Log in with it instead -- you'll be offered to register it as a restaurant owner.";

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const next = safeRedirectPath(String(formData.get("next") ?? ""), "/dashboard");

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
  if (!phone) {
    return {
      error: "Enter a phone number we can reach you on, e.g. 077 123 4567.",
      confirmationSent: false,
    };
  }

  // Where the confirmation email's link should land (if the project has
  // email confirmation on). Next's server actions already reject requests
  // whose Origin doesn't match the host, so this is this app's own origin.
  // It also has to be in Supabase's redirect URL allow-list (see
  // docs/azure-deployment.md); if not, Supabase falls back to the project's
  // Site URL and the owner finishes setup by logging in here instead.
  const origin = (await headers()).get("origin");
  const emailRedirectTo = origin
    ? `${origin}/auth/confirm?next=${encodeURIComponent(next)}`
    : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: OWNER_ACCOUNT_TYPE,
        phone,
        ...(displayName ? { full_name: displayName } : {}),
      },
      emailRedirectTo,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: EXISTING_ACCOUNT_MESSAGE, confirmationSent: false };
    }
    return { error: error.message, confirmationSent: false };
  }

  // With email confirmation on, Supabase answers a sign-up for an email that
  // already has a confirmed account with a fake success (a user with no
  // identities, and no email sent) rather than an error. Without this check
  // the person would wait forever for a confirmation email.
  if (data.user && data.user.identities?.length === 0) {
    return { error: EXISTING_ACCOUNT_MESSAGE, confirmationSent: false };
  }

  // Email confirmation on: no session yet, so the restaurant_owners row
  // (whose insert policy needs auth.uid()) is created once they confirm --
  // by /auth/confirm, or by login via the account_type metadata above.
  if (!data.session || !data.user) {
    return { error: null, confirmationSent: true };
  }

  const { error: ownerError } = await ensureOwnerRow(supabase, data.user, {
    displayName,
    phone,
  });
  if (ownerError) {
    return { error: ownerError, confirmationSent: false };
  }

  redirect(next);
}
