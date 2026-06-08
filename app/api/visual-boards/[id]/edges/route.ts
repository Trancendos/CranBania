import { NextRequest, NextResponse } from "next/server";
import { addVisualEdge, type AddVisualEdgeInput } from "@/lib/visual-board";
import { addVisualEdgeSchema } from "@/lib/schemas/visual-board";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
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
