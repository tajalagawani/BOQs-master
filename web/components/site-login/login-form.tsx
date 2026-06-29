"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import { Input } from "./ui/input";
import { SubmitButton } from "./ui/submit-button";

/**
 * LoginForm — credential block of the portal sign-in. Ported from iox-website
 * (src/components/login/login-form.tsx) and WIRED to this app's NextAuth:
 * the form posts to the `action` server action (credentials sign-in) passed by
 * app/sign-in/page.tsx. The only client state is the password reveal toggle.
 */
const FIELD_SHELL = "border-[#d9d9d9] focus-within:border-[#7b7b7b]";

export type LoginFormProps = {
  /** Server action (credentials sign-in) from app/sign-in/page.tsx. */
  action: (formData: FormData) => void | Promise<void>;
  /** Where to land after a successful sign-in. */
  callbackUrl: string;
  /** When set, render the failed-sign-in banner. */
  error?: string;
};

export function LoginForm({ action, callbackUrl, error }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      action={action}
      className="flex w-full max-w-[400px] flex-col items-center gap-[32px]"
    >
      {/* Instructions — 898:11521 / Header heading 898:11524 */}
      <div className="flex w-full items-center">
        <h1 className="font-sans text-[18px] font-semibold leading-[24px] whitespace-nowrap text-pagent">
          Access the IOX intelligence environment
        </h1>
      </div>

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* Login form — 898:11525 */}
      <div className="flex w-full flex-col items-start gap-[32px]">
        {error ? (
          <p className="w-full text-[13px] font-normal leading-[20px] text-[#c0564d]">
            Sign-in failed. Check your credentials and try again.
          </p>
        ) : null}

        {/* Email — 898:11526 */}
        <Input
          id="login-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email "
          shellClassName={FIELD_SHELL}
        />

        {/* Password group — 898:11527 */}
        <div className="flex w-full flex-col items-start gap-[8px]">
          {/* Password — 898:11528 (required marker "* Password" + eye toggle) */}
          <Input
            id="login-password"
            name="password"
            label="Password"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter password"
            shellClassName={FIELD_SHELL}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="flex size-[16px] shrink-0 items-center justify-center text-neutral-600 transition-colors hover:text-neutral-800"
              >
                <img
                  src="/figma/icon-eye.svg"
                  alt=""
                  aria-hidden
                  className="h-[11px] w-[14.355px]"
                />
              </button>
            }
          />

          {/* Forgot password? — 898:11529 / Button 898:11530 */}
          <div className="flex h-[48px] w-full flex-col items-start justify-center">
            <button
              type="button"
              className="flex h-[32px] items-center justify-center gap-[4px] rounded-[16px] p-[8px]"
            >
              <span className="border-b border-black text-[12px] font-normal leading-[16px] text-pagent">
                Forgot password?
              </span>
            </button>
          </div>
        </div>

        {/* Sign in — 898:11531 / Button 898:11532 */}
        <div className="flex w-full flex-col items-start">
          <SubmitButton className="h-[48px]">Sign in</SubmitButton>
        </div>
      </div>
    </form>
  );
}

export default LoginForm;
