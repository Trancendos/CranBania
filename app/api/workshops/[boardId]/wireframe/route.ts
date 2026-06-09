import { NextRequest, NextResponse } from "next/server";
import { populateWireframeSchema } from "@/lib/schemas/workshop";
import { populateWorkshopWireframe } from "@/lib/workshop";
import type { WireframeComponentSpec } from "@/lib/wireframe";

type Params = { params: Promise<{ boardId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { boardId } = await params;
  const body = await request.json();
  const parsed = populateWireframeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const board = await populateWorkshopWireframe({
    boardId,
    zoneId: parsed.data.zoneId,
    components: parsed.data.components as WireframeComponentSpec[],
    actor: parsed.data.actor,
    replaceExisting: parsed.data.replaceExisting,
  });
  if (!board) {
    return NextResponse.json({ error: "Workshop board not found" }, { status: 404 });
  }

  return NextResponse.json({ board });
}
