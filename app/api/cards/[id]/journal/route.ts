import { NextResponse } from "next/server";
import { getCardJournal } from "@/lib/board";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const journal = await getCardJournal(id);
  if (!journal) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ journal });
}
