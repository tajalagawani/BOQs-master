import { Package, Download } from "lucide-react";
import type { CiArtifact } from "@/lib/platform/github";

interface Props {
  artifacts: CiArtifact[];
}

export function ArtifactsList({ artifacts }: Props) {
  if (artifacts.length === 0) {
    return (
      <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-md px-4 py-4 text-center text-[12px] text-zinc-500">
        This run produced no artifacts
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden bg-white">
      {artifacts.map((a) => (
        <li key={a.id} className="px-3.5 py-2.5 flex items-center gap-3 hover:bg-zinc-50/60">
          <span className="size-7 rounded-lg bg-zinc-100 text-zinc-600 inline-flex items-center justify-center shrink-0">
            <Package className="size-3.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-zinc-900 truncate">{a.name}</div>
            <div className="text-[10.5px] text-zinc-500">
              {formatBytes(a.sizeBytes)}
              {a.expiresAt && (
                <span>
                  {" · "}expires {new Date(a.expiresAt).toLocaleDateString()}
                </span>
              )}
              {a.expired && (
                <span className="ml-1 text-[10px] font-medium text-zinc-500 bg-zinc-200 rounded px-1.5">
                  expired
                </span>
              )}
            </div>
          </div>
          <a
            href={a.archiveDownloadUrl}
            className="text-[11.5px] font-medium text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1"
          >
            <Download className="size-3" strokeWidth={2} /> Download
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}
