import { NextRequest, NextResponse } from "next/server";
import { getVisualBoard } from "@/lib/visual-board";
import { exportVisualBoardSnapshot } from "@/lib/visual-canvas-io";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const board = await getVisualBoard(id);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exportVisualBoardSnapshot(board));
}
