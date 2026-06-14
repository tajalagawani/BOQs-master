import type { Metadata } from "next";
import { Inter, Poppins, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// 10X Suite design-system type ramp. Registered as CSS variables only — they
// don't change the default body font; `.suite` (and suite-* utilities) opt a
// subtree in. See app/globals.css → --font-suite / --font-suite-mono.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IOX — Construction Intelligence Platform",
  description:
    "IOX connects instructions, costs, tenders and budgets — so you can build with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="h-screen overflow-hidden flex flex-col">{children}</body>
    </html>
  );
}
