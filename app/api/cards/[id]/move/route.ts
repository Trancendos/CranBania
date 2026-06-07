import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { moveCard } from "@/lib/board";
import { COLUMN_IDS, type ColumnId } from "@/lib/types";

const moveSchema = z.object({
  columnId: z.enum(COLUMN_IDS as [string, ...string[]]),
  order: z.number().int().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const card = await moveCard(
    id,
    parsed.data.columnId as ColumnId,
    parsed.data.order,
  );
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ card });
}
