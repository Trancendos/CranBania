import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addCodeChange } from "@/lib/board";

const schema = z.object({
  filePath: z.string().min(1),
  changeType: z.enum(["added", "edited", "deleted"]),
  content: z.string(),
  previousContent: z.string().optional(),
  language: z.string().optional(),
  actor: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const card = await addCodeChange(id, parsed.data);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ card }, { status: 201 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { getCard } = await import("@/lib/board");
  const card = await getCard(id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ codeChanges: card.codeChanges });
}
