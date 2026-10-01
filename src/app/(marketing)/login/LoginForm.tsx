"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type LoginState } from "./actions";

export type LoginNotice = "confirmed" | "confirm_failed";

const NOTICE_TEXT: Record<LoginNotice, { text: string; tone: "info" | "error" }> = {
  confirmed: {
    text: "Your email is confirmed. Log in to finish setting up your account.",
    tone: "info",
  },
  confirm_failed: {
    text: "That confirmation link is invalid or has expired. Register again with the same email to get a new one.",
    tone: "error",
  },
};

const initialState: LoginState = { error: null };

export function LoginForm({
  next,
  notice,
}: {
  next: string;
  notice: LoginNotice | null;
}) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <div className="w-full max-w-sm space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Restaurant owner login
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your listing on Kamu.
        </p>
      </div>

      {notice ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            NOTICE_TEXT[notice].tone === "info"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {NOTICE_TEXT[notice].text}
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
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

        {state.error ? (
          <p className="text-sm text-rose-600">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        No account yet?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-semibold text-slate-900 hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
