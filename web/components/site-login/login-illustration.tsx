import Image from "next/image";

import { Heading } from "./ui/heading";
import { cn } from "@/lib/cn";

/**
 * LoginIllustration — RIGHT column of the two-column login screen. Ported from
 * iox-website (src/components/login/login-illustration.tsx). Adaptations:
 * `cn`/`Heading` import paths, and the non-standard `preload` Image prop is
 * replaced with the valid `priority`.
 */
const ILLUSTRATIONS = {
  default: "/figma/login-illustration-default.jpg",
  alt: "/figma/login-illustration-alt.png",
} as const;

export type LoginIllustrationVariant = keyof typeof ILLUSTRATIONS;

export type LoginIllustrationProps = {
  variant?: LoginIllustrationVariant;
  className?: string;
};

export function LoginIllustration({
  variant = "default",
  className,
}: LoginIllustrationProps) {
  const src = ILLUSTRATIONS[variant] ?? ILLUSTRATIONS.default;

  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden rounded-l-[30px]",
        className,
      )}
    >
      {/* Background photo — decorative (the live card below carries the copy) */}
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 880px, 100vw"
        className="object-cover"
      />

      {/* Floating overlay card (node 898:11299) — anchored to the panel's right
          edge; identical for every variant, only the photo behind it changes. */}
      <div className="absolute top-[428px] right-0 z-10 flex w-[572px] flex-col items-start justify-center gap-[8px] rounded-l-[30px] bg-white/95 px-[40px] py-[24px]">
        <div className="flex h-[96px] w-[448px] flex-col items-start justify-center">
          <Heading variant="subtitle2" className="w-[365px]">
            Connected Intelligence for the Built Environment
          </Heading>
        </div>
        <div className="flex items-center">
          <p className="w-[504px] font-sans text-[14px] font-normal leading-[24px] text-neutral-600">
            Connect procurement, commercial and operational intelligence within
            one connected platform environment - designed to support clearer
            decisions and governed project workflows.
          </p>
        </div>
      </div>

      {/* White IOX wordmark (node 898:11304) — bottom-left of the panel */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/iox-logo-white.svg"
        alt="IOX"
        className="absolute bottom-[40px] left-[40px] z-10 h-[24px] w-[40.163px]"
      />
    </div>
  );
}

export default LoginIllustration;
