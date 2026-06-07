import { NextResponse } from "next/server";
import { getBoardSummary, readBoard } from "@/lib/board";
import { getActiveSprint, listEpics, listSprints } from "@/lib/workspace";

export async function GET() {
  const [summary, board, epics, sprints, active] = await Promise.all([
    getBoardSummary(),
    readBoard(),
    listEpics(),
    listSprints(),
    getActiveSprint(),
  ]);
  return NextResponse.json({
    summary,
    epicCount: epics.length,
    sprintCount: sprints.length,
    activeSprint: active,
    zeroCost: true,
    cards: board.cards.length,
  });
}
