/**
 * Zero-cost canvas portability — CranBania JSON (not Lucid/Miro cloud APIs).
 */

import type { VisualBoard, VisualEdge, VisualNode } from "./visual-types";

export interface VisualBoardExport {
  format: "cranbania-visual-board";
  version: 1;
  exportedAt: string;
  board: Pick<
    VisualBoard,
    | "title"
    | "description"
    | "boardType"
    | "nodes"
    | "edges"
    | "viewport"
    | "linkedCardId"
    | "linkedEpicId"
    | "workshopTemplateId"
    | "workshop"
  >;
}

export function exportVisualBoardSnapshot(board: VisualBoard): VisualBoardExport {
  return {
    format: "cranbania-visual-board",
    version: 1,
    exportedAt: new Date().toISOString(),
    board: {
      title: board.title,
      description: board.description,
      boardType: board.boardType,
      nodes: board.nodes,
      edges: board.edges,
      viewport: board.viewport,
      linkedCardId: board.linkedCardId,
      linkedEpicId: board.linkedEpicId,
      workshopTemplateId: board.workshopTemplateId,
      workshop: board.workshop,
    },
  };
}

export function parseVisualBoardImport(body: unknown): VisualBoardExport {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid import payload");
  }
  const data = body as Partial<VisualBoardExport>;
  if (data.format !== "cranbania-visual-board" || data.version !== 1 || !data.board) {
    throw new Error("Expected cranbania-visual-board v1 export");
  }
  if (!Array.isArray(data.board.nodes) || !Array.isArray(data.board.edges)) {
    throw new Error("Board must include nodes and edges arrays");
  }
  return data as VisualBoardExport;
}

export function mergeCanvasImport(
  existingNodes: VisualNode[],
  existingEdges: VisualEdge[],
  imported: VisualBoardExport,
  mode: "replace" | "merge",
): { nodes: VisualNode[]; edges: VisualEdge[] } {
  if (mode === "replace") {
    return { nodes: imported.board.nodes, edges: imported.board.edges };
  }
  const nodeIds = new Set(existingNodes.map((n) => n.id));
  const edgeIds = new Set(existingEdges.map((e) => e.id));
  const offsetX = 40;
  const offsetY = 40;
  const newNodes = imported.board.nodes
    .filter((n) => !nodeIds.has(n.id))
    .map((n) => ({ ...n, x: n.x + offsetX, y: n.y + offsetY }));
  const newEdges = imported.board.edges.filter((e) => !edgeIds.has(e.id));
  return {
    nodes: [...existingNodes, ...newNodes],
    edges: [...existingEdges, ...newEdges],
  };
}
