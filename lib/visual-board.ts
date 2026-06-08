import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_FRAME_COLOR,
  DEFAULT_STICKY_COLOR,
  defaultViewport,
  type VisualBoard,
  type VisualBoardType,
  type VisualEdge,
  type VisualNode,
  type VisualNodeKind,
  type VisualViewport,
} from "./visual-types";
import {
  migrateVisualBoards,
  stampVisualBoards,
  type StoredVisualBoards,
} from "./services/migrations";

function boardsPath() {
  return path.join(process.cwd(), "data", "visual-boards.json");
}

function dataDir() {
  return path.join(process.cwd(), "data");
}

async function ensureDataDir() {
  await fs.mkdir(dataDir(), { recursive: true });
}

export async function readVisualBoards(): Promise<VisualBoard[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(boardsPath(), "utf-8");
    const parsed = JSON.parse(raw) as StoredVisualBoards;
    return migrateVisualBoards(parsed).boards;
  } catch {
    const empty = stampVisualBoards({ boards: [] });
    await fs.writeFile(boardsPath(), JSON.stringify(empty, null, 2), "utf-8");
    return [];
  }
}

async function writeVisualBoards(boards: VisualBoard[]): Promise<void> {
  await ensureDataDir();
  const file = stampVisualBoards({ boards });
  await fs.writeFile(boardsPath(), JSON.stringify(file, null, 2), "utf-8");
}

/** Used by import/export */
export async function writeAllVisualBoards(boards: VisualBoard[]): Promise<void> {
  await writeVisualBoards(boards);
}

export async function getVisualBoard(id: string): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  return boards.find((b) => b.id === id) ?? null;
}

export async function listVisualBoards(filters?: {
  boardType?: VisualBoardType;
  linkedCardId?: string;
}): Promise<VisualBoard[]> {
  let boards = await readVisualBoards();
  if (filters?.boardType) {
    boards = boards.filter((b) => b.boardType === filters.boardType);
  }
  if (filters?.linkedCardId) {
    boards = boards.filter((b) => b.linkedCardId === filters.linkedCardId);
  }
  return boards.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function templateNodes(boardType: VisualBoardType): VisualNode[] {
  switch (boardType) {
    case "flowchart":
      return [
        node("Start", "ellipse", 80, 120, 100, 48, "#86efac"),
        node("Process step", "rectangle", 240, 110, 140, 56),
        node("Decision?", "diamond", 440, 100, 120, 80),
        node("End", "ellipse", 620, 120, 100, 48, "#fca5a5"),
      ].map((n) => ({ ...n, id: randomUUID() }));
    case "mindmap":
      return [
        node("Central topic", "ellipse", 320, 220, 160, 72, "#93c5fd"),
        node("Branch A", "rectangle", 120, 120, 120, 48),
        node("Branch B", "rectangle", 520, 120, 120, 48),
        node("Branch C", "sticky", 320, 380, 140, 100, DEFAULT_STICKY_COLOR),
      ].map((n) => ({ ...n, id: randomUUID() }));
    case "retro":
      return [
        frame("What went well", 40, 80, 280, 360),
        frame("Improve", 360, 80, 280, 360),
        frame("Actions", 680, 80, 280, 360),
        sticky("Add sticky notes here", 60, 140),
        sticky("Add sticky notes here", 380, 140),
        sticky("Add sticky notes here", 700, 140),
      ].map((n) => ({ ...n, id: randomUUID() }));
    case "architecture":
      return [
        node("Client / UI", "rectangle", 80, 80, 140, 56, "#c4b5fd"),
        node("API layer", "rectangle", 280, 80, 140, 56, "#a5b4fc"),
        node("Data store", "parallelogram", 480, 80, 140, 56, "#67e8f9"),
        node("External webhook", "rectangle", 280, 220, 160, 56, "#fcd34d"),
      ].map((n) => ({ ...n, id: randomUUID() }));
    default:
      return [
        sticky("Double-click or use toolbar to add shapes", 120, 120),
      ].map((n) => ({ ...n, id: randomUUID() }));
  }
}

function templateEdges(boardType: VisualBoardType, nodes: VisualNode[]): VisualEdge[] {
  if (boardType !== "flowchart" || nodes.length < 4) return [];
  return [
    { id: randomUUID(), fromNodeId: nodes[0].id, toNodeId: nodes[1].id },
    { id: randomUUID(), fromNodeId: nodes[1].id, toNodeId: nodes[2].id },
    { id: randomUUID(), fromNodeId: nodes[2].id, toNodeId: nodes[3].id, label: "yes" },
  ];
}

function node(
  text: string,
  kind: VisualNodeKind,
  x: number,
  y: number,
  width: number,
  height: number,
  color?: string,
): Omit<VisualNode, "id"> {
  return { kind, x, y, width, height, text, color };
}

function sticky(text: string, x: number, y: number): Omit<VisualNode, "id"> {
  return {
    kind: "sticky",
    x,
    y,
    width: 160,
    height: 120,
    text,
    color: DEFAULT_STICKY_COLOR,
  };
}

function frame(text: string, x: number, y: number, width: number, height: number): Omit<VisualNode, "id"> {
  return {
    kind: "frame",
    x,
    y,
    width,
    height,
    text,
    color: DEFAULT_FRAME_COLOR,
  };
}

export interface CreateVisualBoardInput {
  title: string;
  description?: string;
  boardType?: VisualBoardType;
  linkedCardId?: string;
  linkedEpicId?: string;
}

export async function createVisualBoard(input: CreateVisualBoardInput): Promise<VisualBoard> {
  const boardType = input.boardType ?? "whiteboard";
  const now = new Date().toISOString();
  const nodes = templateNodes(boardType);
  const board: VisualBoard = {
    id: randomUUID(),
    title: input.title,
    description: input.description ?? "",
    boardType,
    nodes,
    edges: templateEdges(boardType, nodes),
    viewport: defaultViewport(),
    linkedCardId: input.linkedCardId,
    linkedEpicId: input.linkedEpicId,
    createdAt: now,
    updatedAt: now,
  };
  const boards = await readVisualBoards();
  boards.push(board);
  await writeVisualBoards(boards);
  return board;
}

export interface UpdateVisualBoardInput {
  title?: string;
  description?: string;
  viewport?: VisualViewport;
  linkedCardId?: string | null;
  linkedEpicId?: string | null;
}

export async function updateVisualBoard(
  id: string,
  input: UpdateVisualBoardInput,
): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  const index = boards.findIndex((b) => b.id === id);
  if (index === -1) return null;
  const board = boards[index];
  boards[index] = {
    ...board,
    ...input,
    linkedCardId:
      input.linkedCardId === null ? undefined : (input.linkedCardId ?? board.linkedCardId),
    linkedEpicId:
      input.linkedEpicId === null ? undefined : (input.linkedEpicId ?? board.linkedEpicId),
    updatedAt: new Date().toISOString(),
  };
  await writeVisualBoards(boards);
  return boards[index];
}

export async function deleteVisualBoard(id: string): Promise<boolean> {
  const boards = await readVisualBoards();
  const next = boards.filter((b) => b.id !== id);
  if (next.length === boards.length) return false;
  await writeVisualBoards(next);
  return true;
}

export interface AddVisualNodeInput {
  kind: VisualNodeKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  cardId?: string;
  parentFrameId?: string;
}

export async function addVisualNode(
  boardId: string,
  input: AddVisualNodeInput,
): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  const index = boards.findIndex((b) => b.id === boardId);
  if (index === -1) return null;

  const defaults = defaultSizeForKind(input.kind);
  const node: VisualNode = {
    id: randomUUID(),
    kind: input.kind,
    x: input.x,
    y: input.y,
    width: input.width ?? defaults.width,
    height: input.height ?? defaults.height,
    text: input.text ?? labelForKind(input.kind),
    color: input.color ?? (input.kind === "sticky" ? DEFAULT_STICKY_COLOR : input.color),
    cardId: input.cardId,
    parentFrameId: input.parentFrameId,
  };

  boards[index].nodes.push(node);
  boards[index].updatedAt = new Date().toISOString();
  await writeVisualBoards(boards);
  return boards[index];
}

function defaultSizeForKind(kind: VisualNodeKind): { width: number; height: number } {
  switch (kind) {
    case "sticky":
      return { width: 160, height: 120 };
    case "text":
      return { width: 200, height: 40 };
    case "frame":
      return { width: 320, height: 240 };
    case "diamond":
      return { width: 120, height: 80 };
    case "ellipse":
      return { width: 120, height: 56 };
    default:
      return { width: 140, height: 56 };
  }
}

function labelForKind(kind: VisualNodeKind): string {
  switch (kind) {
    case "sticky":
      return "Sticky note";
    case "frame":
      return "Frame";
    case "card_link":
      return "Linked card";
    case "diamond":
      return "Decision";
    default:
      return "Shape";
  }
}

export interface UpdateVisualNodeInput {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  cardId?: string | null;
}

export async function updateVisualNode(
  boardId: string,
  nodeId: string,
  input: UpdateVisualNodeInput,
): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  const bIndex = boards.findIndex((b) => b.id === boardId);
  if (bIndex === -1) return null;
  const nIndex = boards[bIndex].nodes.findIndex((n) => n.id === nodeId);
  if (nIndex === -1) return null;

  const node = boards[bIndex].nodes[nIndex];
  boards[bIndex].nodes[nIndex] = {
    ...node,
    ...input,
    cardId: input.cardId === null ? undefined : (input.cardId ?? node.cardId),
  };
  boards[bIndex].updatedAt = new Date().toISOString();
  await writeVisualBoards(boards);
  return boards[bIndex];
}

export async function deleteVisualNode(
  boardId: string,
  nodeId: string,
): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  const bIndex = boards.findIndex((b) => b.id === boardId);
  if (bIndex === -1) return null;

  boards[bIndex].nodes = boards[bIndex].nodes.filter((n) => n.id !== nodeId);
  boards[bIndex].edges = boards[bIndex].edges.filter(
    (e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId,
  );
  boards[bIndex].updatedAt = new Date().toISOString();
  await writeVisualBoards(boards);
  return boards[bIndex];
}

export interface AddVisualEdgeInput {
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style?: VisualEdge["style"];
}

export async function addVisualEdge(
  boardId: string,
  input: AddVisualEdgeInput,
): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  const bIndex = boards.findIndex((b) => b.id === boardId);
  if (bIndex === -1) return null;
  const board = boards[bIndex];
  if (!board.nodes.some((n) => n.id === input.fromNodeId)) return null;
  if (!board.nodes.some((n) => n.id === input.toNodeId)) return null;

  board.edges.push({
    id: randomUUID(),
    fromNodeId: input.fromNodeId,
    toNodeId: input.toNodeId,
    label: input.label,
    style: input.style ?? "solid",
  });
  board.updatedAt = new Date().toISOString();
  await writeVisualBoards(boards);
  return board;
}

export async function deleteVisualEdge(
  boardId: string,
  edgeId: string,
): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  const bIndex = boards.findIndex((b) => b.id === boardId);
  if (bIndex === -1) return null;
  boards[bIndex].edges = boards[bIndex].edges.filter((e) => e.id !== edgeId);
  boards[bIndex].updatedAt = new Date().toISOString();
  await writeVisualBoards(boards);
  return boards[bIndex];
}

/** Replace full node/edge sets (useful for AI batch updates) */
export async function replaceVisualCanvas(
  boardId: string,
  nodes: VisualNode[],
  edges: VisualEdge[],
): Promise<VisualBoard | null> {
  const boards = await readVisualBoards();
  const index = boards.findIndex((b) => b.id === boardId);
  if (index === -1) return null;
  boards[index].nodes = nodes;
  boards[index].edges = edges;
  boards[index].updatedAt = new Date().toISOString();
  await writeVisualBoards(boards);
  return boards[index];
}
