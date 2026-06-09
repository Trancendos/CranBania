import { NextRequest, NextResponse } from "next/server";
import { populateWorkshopSchema } from "@/lib/schemas/workshop";
import { populateWorkshopZones } from "@/lib/workshop";

type Params = { params: Promise<{ boardId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { boardId } = await params;
  const body = await request.json();
  const parsed = populateWorkshopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const board = await populateWorkshopZones({
    boardId,
    ...parsed.data,
  });
  if (!board) {
    return NextResponse.json({ error: "Workshop board not found" }, { status: 404 });
  }

  return NextResponse.json({ board });
}
