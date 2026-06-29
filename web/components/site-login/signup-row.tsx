import { cn } from "@/lib/cn";

/**
 * Signup / request-access row (Figma node 898:11555). Ported from iox-website
 * (src/components/login/signup-row.tsx). Adaptation: this is the portal, so the
 * link points to the marketing site's request-access flow.
 */
export type SignupRowProps = {
  className?: string;
};

const REQUEST_ACCESS_URL = "https://iox-solutions.com/request-access";

export function SignupRow({ className }: SignupRowProps) {
  return (
    <div className={cn("flex items-center gap-[16px] max-sm:flex-col max-sm:items-start max-sm:gap-[8px]", className)}>
      <p className="font-sans text-[14px] font-medium leading-[24px] text-neutral-700 whitespace-nowrap">
        {`Don’t have an account? `}
      </p>
      <a
        href={REQUEST_ACCESS_URL}
        className="inline-flex h-[48px] shrink-0 items-center justify-center gap-[4px] rounded-[16px] p-[8px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pagent/40 focus-visible:ring-offset-2"
      >
        <span className="font-sans text-[14px] font-normal leading-[24px] text-pagent whitespace-nowrap">
          Request Platform Access
        </span>
        <span className="relative size-[16px] shrink-0 overflow-clip">
          <span className="absolute top-1/4 bottom-1/4 left-[37.5%] right-[32.81%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/icon-chevron-right.svg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 block size-full max-w-none"
            />
          </span>
        </span>
      </a>
    </div>
  );
}

export default SignupRow;
