import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCard, listCards } from "@/lib/board";
import {
  CARD_TYPES,
  COLUMN_IDS,
  PRIORITIES,
  PRINCE2_STAGES,
  type ColumnId,
} from "@/lib/types";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  columnId: z.enum(COLUMN_IDS as [string, ...string[]]).optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cardType: z.enum(CARD_TYPES as [string, ...string[]]).optional(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).optional(),
  epicId: z.string().optional(),
  sprintId: z.string().optional(),
  prince2Stage: z.enum(PRINCE2_STAGES as [string, ...string[]]).optional(),
  slaResponseHours: z.number().positive().optional(),
  storyPoints: z.number().int().positive().optional(),
  actor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const columnId = request.nextUrl.searchParams.get("columnId");
  const sprintId = request.nextUrl.searchParams.get("sprintId");
  const cardType = request.nextUrl.searchParams.get("cardType");

  if (columnId && !COLUMN_IDS.includes(columnId as ColumnId)) {
    return NextResponse.json({ error: "Invalid columnId" }, { status: 400 });
  }

  let cards = await listCards(columnId as ColumnId | undefined);
  if (sprintId) cards = cards.filter((c) => c.sprintId === sprintId);
  if (cardType) cards = cards.filter((c) => c.cardType === cardType);

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
  const card = await createCard(parsed.data as Parameters<typeof createCard>[0]);
  return NextResponse.json({ card }, { status: 201 });
}
