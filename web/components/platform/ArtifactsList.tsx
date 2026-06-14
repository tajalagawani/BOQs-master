import { Package, Download } from "lucide-react";
import type { CiArtifact } from "@/lib/platform/github";

interface Props {
  artifacts: CiArtifact[];
}

export function ArtifactsList({ artifacts }: Props) {
  if (artifacts.length === 0) {
    return (
      <div className="bg-suite-card-soft border border-dashed border-suite-line rounded-md px-4 py-4 text-center text-[12px] text-suite-ink-3">
        This run produced no artifacts
      </div>
    );
  }
  return (
    <ul className="divide-y divide-suite-line-soft border border-suite-line rounded-md overflow-hidden bg-white">
      {artifacts.map((a) => (
        <li key={a.id} className="px-3.5 py-2.5 flex items-center gap-3 hover:bg-suite-card-soft">
          <span className="size-7 rounded-lg bg-suite-card-soft text-suite-ink-2 inline-flex items-center justify-center shrink-0">
            <Package className="size-3.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-suite-ink truncate">{a.name}</div>
            <div className="text-[10.5px] text-suite-ink-3">
              {formatBytes(a.sizeBytes)}
              {a.expiresAt && (
                <span>
                  {" · "}expires {new Date(a.expiresAt).toLocaleDateString()}
                </span>
              )}
              {a.expired && (
                <span className="ml-1 text-[10px] font-medium text-suite-neut bg-suite-neut-bg rounded px-1.5">
                  expired
                </span>
              )}
            </div>
          </div>
          <a
            href={a.archiveDownloadUrl}
            className="text-[11.5px] font-medium text-suite-ink-2 hover:text-suite-ink inline-flex items-center gap-1"
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
