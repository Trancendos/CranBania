import { NextRequest, NextResponse } from "next/server";
import {
  updateVisualNode,
  deleteVisualNode,
  type UpdateVisualNodeInput,
} from "@/lib/visual-board";
import { updateVisualNodeSchema } from "@/lib/schemas/visual-board";

type Params = { params: Promise<{ id: string; nodeId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, nodeId } = await params;
  const body = await request.json();
  const parsed = updateVisualNodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const board = await updateVisualNode(id, nodeId, parsed.data as UpdateVisualNodeInput);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, nodeId } = await params;
  const board = await deleteVisualNode(id, nodeId);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
}
