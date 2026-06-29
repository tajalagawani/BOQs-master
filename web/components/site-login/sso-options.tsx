import { cn } from "@/lib/cn";
import { Button } from "./ui/button";

/**
 * SSO options block. Ported from iox-website (src/components/login/sso-options.tsx)
 * and WIRED: the "Continue with SSO" pill posts to the `action` server action
 * (Microsoft Entra sign-in) passed by app/sign-in/page.tsx. The page only renders
 * this block when SSO is configured (ssoEnabled).
 */
export type SsoOptionsProps = {
  /** Server action (Microsoft Entra sign-in) from app/sign-in/page.tsx. */
  action: (formData: FormData) => void | Promise<void>;
  /** Where to land after a successful sign-in. */
  callbackUrl: string;
  /** SSO-only screen: drop the "OR" divider (there's no credential form above). */
  standalone?: boolean;
  className?: string;
};

export function SsoOptions({ action, callbackUrl, standalone, className }: SsoOptionsProps) {
  return (
    <div className={cn("flex w-full flex-col gap-[32px]", className)}>
      {/* OR divider — Figma 898:11547. Hidden when SSO is the only method. */}
      {standalone ? null : (
        <div className="flex h-[24px] w-full items-center justify-center gap-[8px]">
          <div
            aria-hidden="true"
            className="h-px w-[160px] shrink-0 bg-neutral-100"
          />
          <span className="font-sans text-[14px] font-semibold leading-[24px] whitespace-nowrap text-neutral-600">
            OR
          </span>
          <div
            aria-hidden="true"
            className="h-px w-[160px] shrink-0 bg-neutral-100"
          />
        </div>
      )}

      {/* Continue with SSO + enterprise note — Figma 898:11551 */}
      <form action={action} className="flex w-full flex-col gap-[16px]">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {/* Outline "Continue with SSO" pill — Figma 898:11553 */}
        <Button
          type="submit"
          block
          size="md"
          className="h-[48px] border border-pagent bg-transparent text-pagent hover:bg-pagent/[0.04]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/figma/icon-microsoft.svg"
            alt=""
            aria-hidden="true"
            className="block size-[16px] shrink-0"
          />
          Continue with SSO
        </Button>

        <p className="font-sans text-[12px] font-light leading-[16px] whitespace-nowrap text-neutral-600">
          Supports Microsoft enterprise authentication
        </p>
      </form>
    </div>
  );
}

export default SsoOptions;
