"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Kamu restaurant admin panel</p>
      </div>

      <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
        />
      </label>

      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
