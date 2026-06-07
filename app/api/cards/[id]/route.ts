import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteCard, getCard, updateCard } from "@/lib/board";
import {
  CARD_TYPES,
  PRIORITIES,
  PRINCE2_STAGES,
} from "@/lib/types";
import { computeSlaStatus } from "@/lib/sla";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cardType: z.enum(CARD_TYPES as [string, ...string[]]).optional(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).optional(),
  epicId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  prince2Stage: z.enum(PRINCE2_STAGES as [string, ...string[]]).optional(),
  slaResponseHours: z.number().positive().optional(),
  storyPoints: z.number().int().positive().optional(),
  actor: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ card, sla: computeSlaStatus(card) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const card = await updateCard(id, parsed.data as Parameters<typeof updateCard>[1]);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ card, sla: computeSlaStatus(card) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteCard(id);
  if (!ok) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
