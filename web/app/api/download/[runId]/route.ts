import fs from "node:fs";
import { NextResponse } from "next/server";
import { resultPath } from "@/lib/paths";
import { readMeta } from "@/lib/runMeta";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const meta = await readMeta(runId);
  if (!meta) return NextResponse.json({ error: "not found" }, { status: 404 });

  const file = resultPath(runId);
  try {
    const stat = await fs.promises.stat(file);
    const stream = fs.createReadStream(file);
    const outName = meta.originalName.replace(/\.xlsx$/i, "") + "_POMI_Coded.xlsx";
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${outName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "result not ready" }, { status: 404 });
  }
}
