import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { inputPath } from "@/lib/paths";
import { inspectXlsx } from "@/lib/inspectXlsx";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  try {
    const buf = await fs.readFile(inputPath(runId));
    const sheets = await inspectXlsx(buf);
    return NextResponse.json({ runId, sheets });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "inspect failed" },
      { status: 500 },
    );
  }
}
