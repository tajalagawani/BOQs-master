// /api/rates/uploads — server endpoints for the RatesX module.
//
//  POST   /api/rates/uploads             upsert one (section, tab) snapshot
//  DELETE /api/rates/uploads?section&tab delete a snapshot
//  GET    /api/rates/uploads             list every persisted snapshot
//
// Snapshots are the user-uploaded files (xlsx/csv/json) the Omnium UI parses
// in the browser. Persisting them here means every IOX user sees the same
// data across reloads and devices.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dispatchUpload } from "@/modules/rates/lib/db/load-dispatch";

export async function GET() {
  try {
    const uploads = await prisma.ratesUpload.findMany({
      orderBy: { uploadedAt: "asc" },
    });
    return NextResponse.json({
      uploads: uploads.map((u) => ({
        section: u.section,
        tab: u.tab,
        meta: {
          name: u.name,
          size: Number(u.size),
          rowCount: u.rowCount,
          sheetName: u.sheetName ?? undefined,
        },
        rows: u.rows,
        extraColumns: u.extraColumns,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { section, tab, meta, rows, extraColumns } = body ?? {};
    if (typeof section !== "string" || typeof tab !== "string") {
      return NextResponse.json(
        { error: "section and tab are required" },
        { status: 400 },
      );
    }
    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { error: "rows must be an array" },
        { status: 400 },
      );
    }
    const { user } = await getSession();

    // 1) Legacy blob — keep populating so the existing rates-table UI
    //    keeps working until the read path is swapped.
    const saved = await prisma.ratesUpload.upsert({
      where: { section_tab: { section, tab } },
      create: {
        section,
        tab,
        name: meta?.name ?? `${section} :: ${tab}`,
        size: BigInt(meta?.size ?? 0),
        rowCount: rows.length,
        sheetName: meta?.sheetName ?? null,
        rows,
        extraColumns: extraColumns ?? [],
        uploadedById: user.id,
      },
      update: {
        name: meta?.name ?? `${section} :: ${tab}`,
        size: BigInt(meta?.size ?? 0),
        rowCount: rows.length,
        sheetName: meta?.sheetName ?? null,
        rows,
        extraColumns: extraColumns ?? [],
        uploadedById: user.id,
      },
    });

    // 2) Normalize into the v2 fact tables (dimensions + facts + lineage).
    //    Failure here is logged but does not fail the request — the blob is
    //    already saved so the UI keeps working.
    let v2: Awaited<ReturnType<typeof dispatchUpload>> | { kind: "error"; result: { reason: string } } = {
      kind: "noop",
      result: { reason: "no rows" },
    };
    if (rows.length > 0) {
      try {
        v2 = await dispatchUpload({
          sectionLabel: section,
          tabLabel: tab,
          rows: rows as Record<string, unknown>[],
          upload: {
            fileName:    meta?.name ?? `${section} :: ${tab}`,
            sizeBytes:   meta?.size ?? 0,
            sheetName:   meta?.sheetName ?? null,
            parserName:  "rates-uploads-route",
            parserVersion: "1",
            uploadedById: user.id,
            extraColumns,
          },
        });
      } catch (e) {
        console.error("[rates v2 dispatch] failed:", e);
        v2 = { kind: "error", result: { reason: (e as Error).message } };
      }
    }

    return NextResponse.json({ ok: true, id: saved.id, v2 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const section = url.searchParams.get("section");
    const tab = url.searchParams.get("tab");
    if (!section || !tab) {
      return NextResponse.json(
        { error: "section and tab query params are required" },
        { status: 400 },
      );
    }
    await prisma.ratesUpload
      .delete({ where: { section_tab: { section, tab } } })
      .catch(() => null); // delete is idempotent
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
