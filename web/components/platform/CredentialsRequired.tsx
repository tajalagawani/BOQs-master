import { KeyRound, ExternalLink } from "lucide-react";

interface Props {
  title: string;
  description: string;
  /** Each env var that must be set. */
  vars: { name: string; hint?: string }[];
  /** Optional command to suggest for creating the credential. */
  setupCommand?: string;
  /** Optional doc link. */
  docHref?: string;
  docLabel?: string;
}

/**
 * Friendly empty state shown when a platform integration is missing its
 * env vars. Designed to be informative without leaking sensitive context.
 */
export function CredentialsRequired({
  title,
  description,
  vars,
  setupCommand,
  docHref,
  docLabel,
}: Props) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-700 inline-flex items-center justify-center shrink-0">
          <KeyRound className="size-4.5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-[12.5px] text-zinc-600 leading-relaxed max-w-xl">
            {description}
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {vars.map((v) => (
              <div
                key={v.name}
                className="bg-zinc-50 border border-zinc-200 rounded-md px-2.5 py-1.5 text-[11.5px]"
              >
                <code className="font-mono font-medium text-zinc-900">{v.name}</code>
                {v.hint && <span className="ml-2 text-zinc-500">{v.hint}</span>}
              </div>
            ))}
          </div>

          {setupCommand && (
            <div className="mt-4">
              <div className="text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium mb-1">
                Create the credential
              </div>
              <pre className="bg-zinc-950 text-zinc-100 text-[11px] px-3 py-2.5 rounded-md overflow-x-auto leading-relaxed">
                {setupCommand}
              </pre>
            </div>
          )}

          {docHref && (
            <a
              href={docHref}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-700 hover:text-zinc-900"
            >
              {docLabel ?? "Setup docs"} <ExternalLink className="size-3" strokeWidth={1.75} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
