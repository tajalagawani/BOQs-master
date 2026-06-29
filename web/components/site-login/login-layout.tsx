import Image from "next/image";

import { cn } from "@/lib/cn";

/**
 * LoginLayout — standalone two-column auth scaffold for the portal /sign-in
 * route. Ported from iox-website (src/components/login/login-layout.tsx).
 * Adaptations for this app: `cn` import path, and the root carries `iox-login`
 * so app/globals.css can scope the website's exact Neutrals palette here only.
 */
const ILLUSTRATIONS = {
  default: {
    src: "/figma/login-illustration-default.jpg",
    alt: "IOX team collaborating in a modern meeting room",
  },
  alt: {
    src: "/figma/login-illustration-alt.png",
    alt: "Construction site planning with hard hats and building plans",
  },
} as const;

export type LoginIllustrationVariant = keyof typeof ILLUSTRATIONS;

export interface LoginLayoutProps {
  illustration?: LoginIllustrationVariant;
  children: React.ReactNode;
  illustrationContent?: React.ReactNode;
  className?: string;
}

export function LoginLayout({
  illustration = "default",
  children,
  illustrationContent,
  className,
}: LoginLayoutProps) {
  const art = ILLUSTRATIONS[illustration] ?? ILLUSTRATIONS.default;

  return (
    <main className={cn("iox-login flex min-h-screen w-full bg-white", className)}>
      {/* Left — form column (node 898:11515, 560px, 80px horizontal gutter) */}
      <div className="flex w-full shrink-0 flex-col bg-white px-6 pt-[40px] pb-[40px] md:px-10 lg:w-[560px] lg:px-[80px]">
        {children}
      </div>

      {/* Right — illustration panel (node 898:8872, 880px); hidden on mobile */}
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <Image
          src={art.src}
          alt={art.alt}
          fill
          priority
          sizes="(min-width: 1024px) calc(100vw - 560px), 100vw"
          className="object-cover"
        />

        {illustrationContent}

        {/* White IOX wordmark (section 898:8870 "IOX Logo White", 26.7754×16) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/iox-logo-white.svg"
          alt="IOX"
          className="absolute bottom-[48px] left-[40px] h-[16px] w-[26.775px]"
        />
      </div>
    </main>
  );
}

export default LoginLayout;
