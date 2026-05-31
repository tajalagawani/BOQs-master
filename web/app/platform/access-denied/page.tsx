import Link from "next/link";
import { Lock } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="size-14 mx-auto rounded-full bg-zinc-100 inline-flex items-center justify-center">
        <Lock className="size-6 text-zinc-500" strokeWidth={1.75} />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-zinc-900">
        Platform access required
      </h1>
      <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
        The IOX Platform dashboard is restricted to super-admin operators.
        If you believe you should have access, ask the Tech Lead to grant
        you the <code className="text-[12px] bg-zinc-100 px-1 py-0.5 rounded">SUPER_ADMIN</code> role.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center h-10 px-4 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
      >
        Back to IOX home
      </Link>
    </div>
  );
}
