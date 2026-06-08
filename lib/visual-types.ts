/** Lucid/Miro-style visual canvas types — JSON-native, zero SaaS */

export type VisualBoardType =
  | "whiteboard"
  | "flowchart"
  | "mindmap"
  | "retro"
  | "architecture";

export type VisualNodeKind =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "parallelogram"
  | "sticky"
  | "text"
  | "frame"
  | "card_link";

export type VisualEdgeStyle = "solid" | "dashed" | "dotted";

export interface VisualViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface VisualNode {
  id: string;
  kind: VisualNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color?: string;
  /** Link to Kanban card (Miro card widget style) */
  cardId?: string;
  parentFrameId?: string;
  meta?: Record<string, unknown>;
}

export interface VisualEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style?: VisualEdgeStyle;
}

export interface VisualBoard {
  id: string;
  title: string;
  description: string;
  boardType: VisualBoardType;
  nodes: VisualNode[];
  edges: VisualEdge[];
  viewport: VisualViewport;
  linkedCardId?: string;
  linkedEpicId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisualBoardsFile {
  boards: VisualBoard[];
  version?: number;
}

export const VISUAL_BOARD_TYPES: VisualBoardType[] = [
  "whiteboard",
  "flowchart",
  "mindmap",
  "retro",
  "architecture",
];

export const VISUAL_NODE_KINDS: VisualNodeKind[] = [
  "rectangle",
  "diamond",
  "ellipse",
  "parallelogram",
  "sticky",
  "text",
  "frame",
  "card_link",
];

export const DEFAULT_STICKY_COLOR = "#fef08a";
export const DEFAULT_FRAME_COLOR = "#334155";

export function defaultViewport(): VisualViewport {
  return { x: 0, y: 0, zoom: 1 };
}
