import { NextRequest, NextResponse } from "next/server";
import { getVisualBoard, updateVisualPresence } from "@/lib/visual-board";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const presenceSchema = z.object({
  sessionId: z.string().min(1),
  label: z.string().min(1).max(64),
  x: z.number(),
  y: z.number(),
});

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const board = await getVisualBoard(id);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cutoff = Date.now() - 30_000;
  const presence = (board.presence ?? []).filter(
    (p) => new Date(p.updatedAt).getTime() > cutoff,
  );
  return NextResponse.json({ presence });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = presenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const board = await updateVisualPresence(id, parsed.data);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
}
