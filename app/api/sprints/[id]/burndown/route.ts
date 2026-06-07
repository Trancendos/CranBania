import { NextResponse } from "next/server";
import { readBoard } from "@/lib/board";
import { getSprintBurndown } from "@/lib/workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const board = await readBoard();
  const burndown = await getSprintBurndown(id, board.cards);
  if (!burndown) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }
  return NextResponse.json({ burndown });
}
