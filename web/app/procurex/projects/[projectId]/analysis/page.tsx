import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"
import { getOmniDetailedAnalysis } from "@/lib/procurex/data/omni-data"
import { AnalysisTabs } from "./analysis-tabs"
import { OmniShell } from "@/components/procurex/omni/omni-shell"

export default async function OmniDetailedAnalysisPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const analysis = await getOmniDetailedAnalysis(projectId)
  if (!analysis) notFound()

  return (
    <OmniShell>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/procurex/projects/${projectId}`}
            className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {analysis.projectName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Detailed Analysis</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 bg-[#3a3a3d] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2a2a2c] transition-colors"
        >
          <FileText className="w-4 h-4" />
          Generate PTC
        </button>
      </div>

      <AnalysisTabs analysis={analysis} />
    </div>
    </OmniShell>
  )
}
