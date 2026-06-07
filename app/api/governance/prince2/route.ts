import { NextResponse } from "next/server";
import { getPrince2Overview, readBoard } from "@/lib/board";

export async function GET() {
  const overview = await getPrince2Overview();
  const board = await readBoard();
  return NextResponse.json({
    overview,
    cardsByStage: overview,
    totalCards: board.cards.length,
  });
}
