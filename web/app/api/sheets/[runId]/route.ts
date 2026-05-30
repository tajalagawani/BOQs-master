import { NextResponse } from "next/server";
import { resultPath } from "@/lib/paths";
import { listSheets } from "@/lib/readResult";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  try {
    const sheets = await listSheets(resultPath(runId));
    return NextResponse.json({ runId, sheets });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "list failed" },
      { status: 500 },
    );
  }
}
