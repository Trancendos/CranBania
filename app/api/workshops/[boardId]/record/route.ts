import { NextRequest, NextResponse } from "next/server";
import { recordWorkshopSchema } from "@/lib/schemas/workshop";
import { extractWorkshopOutcomes, recordWorkshopOutcomes } from "@/lib/workshop";
import { getVisualBoard } from "@/lib/visual-board";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { boardId } = await params;
  const board = await getVisualBoard(boardId);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const summary = extractWorkshopOutcomes(board);
  if (!summary) {
    return NextResponse.json({ error: "Not a workshop board" }, { status: 400 });
  }
  return NextResponse.json({ summary, board });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { boardId } = await params;
  const body = await request.json();
  const parsed = recordWorkshopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await recordWorkshopOutcomes({ boardId, ...parsed.data });
  if (!result) {
    return NextResponse.json({ error: "Workshop board not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
