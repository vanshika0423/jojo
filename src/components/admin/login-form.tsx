"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/admin/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field"
          defaultValue={state.email}
          key={state.email}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className="field"
        />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-[#f7e6e2] px-4 py-3 text-sm text-[#7e3128]">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
