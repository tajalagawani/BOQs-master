import { Header } from "@/components/Header";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { PlatformNav } from "@/components/platform/PlatformNav";

export const metadata = {
  title: "IOX Platform",
  description: "Internal platform dashboard — docs, KPIs, ops, monitoring",
};

function PlatformBrand() {
  return (
    <div className="leading-tight">
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-zinc-400 font-semibold">
        IOX
      </div>
      <div className="text-[12.5px] font-semibold text-zinc-900 -mt-0.5">
        Platform
      </div>
      <div className="text-[10px] text-zinc-500 leading-none">
        Internal control plane
      </div>
    </div>
  );
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header variant="transparent" brand={<PlatformBrand />} />
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
