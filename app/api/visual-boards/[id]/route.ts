import { NextRequest, NextResponse } from "next/server";
import {
  deleteVisualBoard,
  getVisualBoard,
  replaceVisualCanvas,
  updateVisualBoard,
} from "@/lib/visual-board";
import {
  replaceCanvasSchema,
  updateVisualBoardSchema,
} from "@/lib/schemas/visual-board";
import type { VisualEdge, VisualNode } from "@/lib/visual-types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const board = await getVisualBoard(id);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (body.nodes && body.edges) {
    const canvas = replaceCanvasSchema.safeParse(body);
    if (!canvas.success) {
      return NextResponse.json(
        { error: "Invalid canvas", details: canvas.error.flatten() },
        { status: 400 },
      );
    }
    const board = await replaceVisualCanvas(
      id,
      canvas.data.nodes as VisualNode[],
      canvas.data.edges as VisualEdge[],
    );
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ board });
  }

  const parsed = updateVisualBoardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const board = await updateVisualBoard(id, parsed.data);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ok = await deleteVisualBoard(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
