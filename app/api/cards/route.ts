import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCard, listCards } from "@/lib/board";
import { COLUMN_IDS, type ColumnId } from "@/lib/types";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  columnId: z.enum(COLUMN_IDS as [string, ...string[]]).optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const columnId = request.nextUrl.searchParams.get("columnId");
  if (columnId && !COLUMN_IDS.includes(columnId as (typeof COLUMN_IDS)[number])) {
    return NextResponse.json({ error: "Invalid columnId" }, { status: 400 });
  }
  const cards = await listCards(
    columnId as (typeof COLUMN_IDS)[number] | undefined,
  );
  return NextResponse.json({ cards });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const card = await createCard({
    ...parsed.data,
    columnId: parsed.data.columnId as ColumnId | undefined,
  });
  return NextResponse.json({ card }, { status: 201 });
}
