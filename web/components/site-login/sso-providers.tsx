import { Button } from "./ui/button";
import { cn } from "@/lib/cn";

/**
 * SSO providers — expanded state, hidden by default (Figma node 898:11537).
 * Ported verbatim from iox-website (src/components/login/sso-providers.tsx);
 * only the `Button`/`cn` import paths are adapted. Renders null unless `open`.
 */
type Provider = {
  label: string;
  icon: string;
  iconClassName: string;
  fixedLabel: boolean;
};

const PROVIDERS: readonly Provider[] = [
  {
    label: "Login with Apple",
    icon: "/figma/icon-apple.svg",
    iconClassName: "h-[14px] w-[11.7951px]",
    fixedLabel: true,
  },
  {
    label: "Login with Google",
    icon: "/figma/icon-google.svg",
    iconClassName: "size-[16px]",
    fixedLabel: true,
  },
  {
    label: "Login with Facebook",
    icon: "/figma/icon-facebook.svg",
    iconClassName: "size-[16px]",
    fixedLabel: false,
  },
];

export type SsoProvidersProps = {
  open?: boolean;
  className?: string;
  id?: string;
};

export function SsoProviders({ open = false, className, id }: SsoProvidersProps) {
  if (!open) return null;

  return (
    <div
      id={id}
      className={cn("flex w-full flex-col items-start gap-[16px]", className)}
    >
      {PROVIDERS.map((provider) => (
        <Button
          key={provider.label}
          type="button"
          size="md"
          block
          className="h-[48px] border border-solid border-[#141414] bg-transparent text-[#141414] hover:bg-[#141414]/[0.04]"
        >
          <span className="relative flex size-[16px] shrink-0 items-center justify-center overflow-clip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={provider.icon}
              alt=""
              aria-hidden="true"
              className={cn("block max-w-none", provider.iconClassName)}
            />
          </span>
          <span
            className={cn(
              "font-sans text-[14px] font-normal leading-[24px] text-[#141414]",
              provider.fixedLabel
                ? "w-[138px] [word-break:break-word]"
                : "whitespace-nowrap",
            )}
          >
            {provider.label}
          </span>
        </Button>
      ))}
    </div>
  );
}

export default SsoProviders;
