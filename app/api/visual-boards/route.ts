import { NextRequest, NextResponse } from "next/server";
import { createVisualBoard, listVisualBoards, type CreateVisualBoardInput } from "@/lib/visual-board";
import { createVisualBoardSchema } from "@/lib/schemas/visual-board";
import { VISUAL_BOARD_TYPES } from "@/lib/visual-types";

export async function GET(request: NextRequest) {
  const boardType = request.nextUrl.searchParams.get("boardType");
  const linkedCardId = request.nextUrl.searchParams.get("linkedCardId");

  if (boardType && !VISUAL_BOARD_TYPES.includes(boardType as (typeof VISUAL_BOARD_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid boardType" }, { status: 400 });
  }

  const boards = await listVisualBoards({
    boardType: boardType as (typeof VISUAL_BOARD_TYPES)[number] | undefined,
    linkedCardId: linkedCardId ?? undefined,
  });

  return NextResponse.json({ boards });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createVisualBoardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const board = await createVisualBoard(parsed.data as CreateVisualBoardInput);
  return NextResponse.json({ board }, { status: 201 });
}
