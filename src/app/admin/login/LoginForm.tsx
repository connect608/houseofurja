"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/menuActions";
import ArrowIcon from "@/components/ui/ArrowIcon";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="bg-red-100 p-3 text-xs text-red-700 border border-red-200">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-[#2e1c18]/70"
        >
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@houseofurja.us"
          className="mt-1 block w-full border border-[#2e1c18]/20 bg-white px-4 py-3 text-sm text-[#2e1c18] placeholder-[#2e1c18]/30 focus:border-[#df8b32] focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-semibold uppercase tracking-wider text-[#2e1c18]/70"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 block w-full border border-[#2e1c18]/20 bg-white px-4 py-3 text-base text-[#2e1c18] placeholder-[#2e1c18]/30 focus:border-[#df8b32] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="button button-light w-full justify-center !py-3.5 !text-sm"
      >
        {isPending ? "Verifying..." : "Sign In to Portal"} <ArrowIcon />
      </button>
    </form>
  );
}

