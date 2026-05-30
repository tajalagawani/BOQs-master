import { NextResponse } from "next/server";
import { resultPath } from "@/lib/paths";
import { readSheet } from "@/lib/readResult";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string; name: string }> },
) {
  const { runId, name } = await params;
  try {
    const data = await readSheet(resultPath(runId), decodeURIComponent(name));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "read failed" },
      { status: 500 },
    );
  }
}
