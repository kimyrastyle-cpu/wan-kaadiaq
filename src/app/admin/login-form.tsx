"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-xs space-y-4">
      <h1 className="text-xl font-bold">Admin</h1>
      <input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        required
        autoFocus
        className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-foreground"
      />
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-full bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-50"
      >
        {pending ? "Menyemak…" : "Log masuk"}
      </button>
    </form>
  );
}
