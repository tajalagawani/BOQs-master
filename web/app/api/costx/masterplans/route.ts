/**
 * POST /api/costx/masterplans — create a new masterplan.
 *
 * Calculated fields default to 0 — they'll be filled in once the
 * masterplan editor lets you add building assets, parking, infra and
 * public-realm entries.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

interface CreateBody {
  name: string;
  description?: string;
  grossLandArea: number;
  totalUnits?: number;
  parkingSpaces?: number;
  contingency?: number;
  assetClass: string;
  assetTypeL1: string;
  assetFormL2?: string;
  numberOfPhases?: number;
  country?: string;
  developer?: string;
}

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const required = ["name", "grossLandArea", "assetClass", "assetTypeL1"] as const;
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return NextResponse.json(
        { error: `${k} is required` },
        { status: 400 },
      );
    }
  }

  const session = await getSession();

  const masterplan = await prisma.masterplan.create({
    data: {
      name: body.name,
      description: body.description || null,
      grossLandArea: body.grossLandArea,
      calculatedPlotArea: 0,        // filled when building assets are added
      balanceExternalArea: body.grossLandArea, // = GLA until areas consumed
      totalUnits: body.totalUnits ?? 0,
      parkingSpaces: body.parkingSpaces ?? 0,
      contingency: body.contingency ?? 0,
      totalCost: 0,
      costPerGfa: 0,
      assetClass: body.assetClass,
      assetTypeL1: body.assetTypeL1,
      assetFormL2: body.assetFormL2 || null,
      numberOfPhases: body.numberOfPhases ?? 1,
      country: body.country || null,
      developer: body.developer || null,
      status: "DRAFT",
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ id: masterplan.id }, { status: 201 });
}
