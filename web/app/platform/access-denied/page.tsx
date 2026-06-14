import Link from "next/link";
import { Lock } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="size-14 mx-auto rounded-full bg-suite-card-soft border border-suite-line inline-flex items-center justify-center">
        <Lock className="size-6 text-suite-ink-3" strokeWidth={1.75} />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-suite-ink">
        Platform access required
      </h1>
      <p className="mt-2 text-sm text-suite-ink-2 leading-relaxed">
        The IOX Platform dashboard is restricted to super-admin operators.
        If you believe you should have access, ask the Tech Lead to grant
        you the <code className="text-[12px] bg-suite-card-soft border border-suite-line text-suite-ink px-1 py-0.5 rounded suite-num">SUPER_ADMIN</code> role.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center h-10 px-4 rounded-full bg-suite-navy hover:bg-suite-navy-2 text-white text-sm font-medium"
      >
        Back to IOX home
      </Link>
    </div>
  );
}
