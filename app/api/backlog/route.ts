import { NextResponse } from "next/server";
import { listBacklog } from "@/lib/board";

export async function GET() {
  const cards = await listBacklog();
  return NextResponse.json({ column: "backlog", cards });
}
