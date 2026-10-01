"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null, confirmationSent: false };

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(
    register,
    initialState,
  );

  if (state.confirmationSent) {
    return (
      <div className="w-full max-w-sm space-y-3 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Check your email
        </h1>
        <p className="text-sm text-slate-600">
          We sent a confirmation link. Click it to finish creating your
          account, then log in.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Register your restaurant
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create an owner account to manage your listing on Kamu.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block text-sm font-medium text-slate-700">
          Your name
          <input
            type="text"
            name="displayName"
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>

        {state.error ? (
          <p className="text-sm text-rose-600">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
        >
          {isPending ? "Creating account…" : "Register"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-slate-900 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
