import { NextResponse } from "next/server";
import { readBoard } from "@/lib/board";

export async function GET() {
  const board = await readBoard();
  return NextResponse.json(board);
}
