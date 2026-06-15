// ioProcure route group — runs INSIDE IOX's root <html>/<body>.
// Inter + global CSS come from web/app/layout.tsx. We only add Poppins
// here (OmniApp uses it for some heading weights) and apply it via a
// CSS variable on a wrapper div so it doesn't leak into other modules.

import type { Metadata } from "next";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "ioProcure — IOX",
  description: "Tender intelligence workspace",
};

export default function ProcurexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // IOX's root <body> is `h-screen overflow-hidden flex-col`, so each
  // module owns its own scroll. ioProcure pages were designed standalone
  // (use `min-h-screen` internally), so give the wrapper its own
  // overflow-y-auto and let the pages scroll inside the viewport.
  return (
    <div className={`${poppins.variable} flex-1 min-h-0 flex flex-col overflow-y-auto`}>
      {children}
    </div>
  );
}
