import { cn } from "@/lib/cn";

/**
 * Return-to-website back link (Figma node 898:11517). Ported from iox-website
 * (src/components/login/return-to-website.tsx). Adaptation: this is the portal,
 * so the link leaves to the marketing site (iox-solutions.com) rather than "/".
 */
export type ReturnToWebsiteProps = {
  className?: string;
};

const WEBSITE_URL = "https://iox-solutions.com";

export function ReturnToWebsite({ className }: ReturnToWebsiteProps) {
  return (
    <a
      href={WEBSITE_URL}
      className={cn(
        "inline-flex items-center justify-center rounded-[16px] p-[8px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pagent/40 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="flex items-center justify-center gap-[8px]">
        <span className="relative size-[16px] shrink-0 overflow-clip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/figma/icon-chevron-left.svg"
            alt=""
            aria-hidden="true"
            className="absolute top-1/2 left-[32.81%] right-[37.5%] h-[8px] -translate-y-1/2 block max-w-none"
          />
        </span>
        <span className="font-sans text-[14px] font-normal leading-[24px] text-pagent whitespace-nowrap">
          Return to website
        </span>
      </span>
    </a>
  );
}

export default ReturnToWebsite;
