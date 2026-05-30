import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface ModuleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  /**
   * Optional wireframe background image. Rendered as a watermark
   * anchored to the bottom-right of the card with reduced opacity,
   * so text/icon stay legible on top.
   */
  backgroundImage?: string;
}

export function ModuleCard({
  icon,
  title,
  description,
  href,
  backgroundImage,
}: ModuleCardProps) {
  const inner = (
    <div
      className={cn(
        "iox-card-hover relative h-full rounded-2xl bg-white border border-zinc-200 p-3 flex flex-col overflow-hidden",
        href ? "cursor-pointer" : "cursor-default",
      )}
    >
      {backgroundImage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-100 mix-blend-multiply"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "120%",
            backgroundPosition: "right -20% bottom -10%",
            backgroundRepeat: "no-repeat",
            // Fade FROM top-right: top-right corner is transparent, image
            // builds back to fully opaque toward the bottom-left. Keeps the
            // icon/title (top-left) clear while showing the wireframe below.
            maskImage:
              "linear-gradient(to bottom left, transparent 0%, transparent 18%, rgba(0,0,0,0.5) 50%, black 85%)",
            WebkitMaskImage:
              "linear-gradient(to bottom left, transparent 0%, transparent 18%, rgba(0,0,0,0.5) 50%, black 85%)",
          }}
        />
      )}
      <div className="relative text-zinc-900 mb-2">{icon}</div>
      <h3 className="relative text-[13px] font-semibold text-zinc-900 leading-snug mb-1">
        {title}
      </h3>
      <p className="relative text-[11.5px] text-zinc-500 leading-snug flex-1 line-clamp-2">
        {description}
      </p>
      <div className="relative mt-1.5">
        <ArrowRight
          className={cn(
            "iox-arrow size-4",
            href ? "text-zinc-900" : "text-zinc-300",
          )}
          strokeWidth={1.5}
        />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return <div className="h-full">{inner}</div>;
}
