import { NextRequest, NextResponse } from "next/server";
import { addVisualNode, type AddVisualNodeInput } from "@/lib/visual-board";
import { addVisualNodeSchema } from "@/lib/schemas/visual-board";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = addVisualNodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const board = await addVisualNode(id, parsed.data as AddVisualNodeInput);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board }, { status: 201 });
}
