import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addComment } from "@/lib/board";

const schema = z.object({
  message: z.string().min(1),
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
  const card = await addComment(id, parsed.data.message, parsed.data.actor);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ card }, { status: 201 });
}
