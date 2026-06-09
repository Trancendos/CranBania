import { NextRequest, NextResponse } from "next/server";
import {
  getVisualBoard,
  replaceVisualCanvas,
  updateVisualBoard,
} from "@/lib/visual-board";
import {
  mergeCanvasImport,
  parseVisualBoardImport,
} from "@/lib/visual-canvas-io";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const board = await getVisualBoard(id);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const mode = body.mode === "merge" ? "merge" : "replace";
  let imported;
  try {
    imported = parseVisualBoardImport(body.export ?? body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid import" },
      { status: 400 },
    );
  }

  const { nodes, edges } = mergeCanvasImport(board.nodes, board.edges, imported, mode);
  const updated = await replaceVisualCanvas(id, nodes, edges);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (mode === "replace" && imported.board.workshop) {
    await updateVisualBoard(id, {
      workshopTemplateId: imported.board.workshopTemplateId ?? null,
      workshop: imported.board.workshop,
    });
  }

  const final = (await getVisualBoard(id))!;
  return NextResponse.json({ board: final, mode, importedAt: new Date().toISOString() });
}
