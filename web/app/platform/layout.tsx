import { Header } from "@/components/Header";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { PlatformNav } from "@/components/platform/PlatformNav";

export const metadata = {
  title: "IOX Platform",
  description: "Internal platform dashboard — docs, KPIs, ops, monitoring",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {/* Mobile-only horizontal tab strip; sidebar hides under md: */}
      <div className="md:hidden shrink-0">
        <PlatformNav />
      </div>
      <div className="flex flex-1 min-h-0">
        <PlatformSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto bg-zinc-50">
          {children}
        </main>
      </div>
    </>
  );
}
