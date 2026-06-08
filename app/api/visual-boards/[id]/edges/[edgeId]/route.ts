import { NextRequest, NextResponse } from "next/server";
import { addVisualEdge, deleteVisualEdge, type AddVisualEdgeInput } from "@/lib/visual-board";
import { addVisualEdgeSchema } from "@/lib/schemas/visual-board";

type Params = { params: Promise<{ id: string; edgeId: string }> };

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = addVisualEdgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const board = await addVisualEdge(id, parsed.data as AddVisualEdgeInput);
  if (!board) {
    return NextResponse.json({ error: "Not found or invalid node ids" }, { status: 404 });
  }
  return NextResponse.json({ board }, { status: 201 });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, edgeId } = await params;
  const board = await deleteVisualEdge(id, edgeId);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
}
