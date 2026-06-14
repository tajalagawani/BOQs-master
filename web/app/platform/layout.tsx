import { PlatformNav } from "@/components/platform/PlatformNav";
import { PLATFORM_SECTIONS } from "@/components/platform/PlatformSidebar";
import { SuiteRails, SuiteSidebar, SuiteTopNav } from "@/components/suite";

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
    <div className="suite flex h-full flex-col bg-suite-page">
      <SuiteRails />
      <SuiteTopNav
        crumb={<span className="font-semibold text-[#cdd6e6]">Platform</span>}
        notifications={1}
      />
      <div className="shrink-0 md:hidden">
        <PlatformNav />
      </div>
      <div className="flex min-h-0 flex-1">
        <SuiteSidebar
          sections={PLATFORM_SECTIONS}
          footer={
            <>
              <div className="flex items-center gap-1.5">
                <span className="relative inline-flex size-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-50" />
                  <span className="relative size-1.5 rounded-full bg-emerald-500" />
                </span>
                Live · UAE North
              </div>
              <div className="mt-0.5">iox-vm-01 · D2s_v3</div>
            </>
          }
        />
        <main className="min-w-0 flex-1 overflow-y-auto bg-suite-page">
          {children}
        </main>
      </div>
    </div>
  );
}
