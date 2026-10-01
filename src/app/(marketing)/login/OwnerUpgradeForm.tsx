"use client";

import { useActionState } from "react";
import { signOut, upgradeToOwner, type UpgradeState } from "./actions";

const initialState: UpgradeState = { error: null };

/**
 * Shown to a signed-in account that has no restaurant_owners row: either an
 * existing Kamu customer account (auth.users is shared with the customer
 * app), or an owner whose registration didn't finish. Becoming an owner is
 * always an explicit choice -- never automatic on login.
 */
export function OwnerUpgradeForm({
  email,
  next,
  finishingRegistration,
  defaultName,
  defaultPhone,
}: {
  email: string;
  next: string;
  finishingRegistration: boolean;
  defaultName: string;
  defaultPhone: string;
}) {
  const [state, formAction, isPending] = useActionState(
    upgradeToOwner,
    initialState,
  );

  return (
    <div className="w-full max-w-sm space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900">
          {finishingRegistration
            ? "Finish setting up your owner account"
            : "Register as a restaurant owner?"}
        </h1>
        {finishingRegistration ? (
          <p className="text-sm text-slate-600">
            Check your details below to finish registering{" "}
            <span className="font-medium text-slate-900">{email}</span>.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{email}</span> already
            has a Kamu account, but it isn&apos;t registered as a restaurant
            owner. Registering it won&apos;t change how it works on the
            customer site.
          </p>
        )}
        <p className="text-sm text-slate-600">
          The Kamu team verifies every new owner once before their listing
          goes live.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block text-sm font-medium text-slate-700">
          Your name
          <input
            type="text"
            name="displayName"
            defaultValue={defaultName}
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone number
          <input
            type="tel"
            name="phone"
            required
            defaultValue={defaultPhone}
            autoComplete="tel"
            placeholder="077 123 4567"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Only used by the Kamu team to verify your restaurant. Never shown
            to customers.
          </span>
        </label>

        {state.error ? (
          <p className="text-sm text-rose-600">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
        >
          {isPending
            ? "Saving…"
            : finishingRegistration
              ? "Finish setup"
              : "Register as owner"}
        </button>
      </form>

      <form action={signOut} className="text-center">
        <button
          type="submit"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Not now, sign out
        </button>
      </form>
    </div>
  );
}
