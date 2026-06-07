import { NextResponse } from "next/server";
import { getBoardSummary } from "@/lib/board";

export async function GET() {
  const summary = await getBoardSummary();
  return NextResponse.json(summary);
}
