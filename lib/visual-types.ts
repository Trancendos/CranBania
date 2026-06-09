/** Lucid/Miro-style visual canvas types — JSON-native, zero SaaS */

export type VisualBoardType =
  | "whiteboard"
  | "flowchart"
  | "mindmap"
  | "retro"
  | "architecture"
  | "wireframe"
  | "design_system"
  | "roadmap";

export type VisualNodeKind =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "parallelogram"
  | "sticky"
  | "text"
  | "frame"
  | "card_link"
  | "wire_heading"
  | "wire_label"
  | "wire_button"
  | "wire_input"
  | "wire_checkbox"
  | "wire_nav"
  | "wire_image"
  | "wire_card"
  | "wire_divider";

/** Wireframe / UI kit node kinds for MCP and toolbar */
export const WIREFRAME_NODE_KINDS: VisualNodeKind[] = [
  "wire_heading",
  "wire_label",
  "wire_button",
  "wire_input",
  "wire_checkbox",
  "wire_nav",
  "wire_image",
  "wire_card",
  "wire_divider",
];

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

/** Lightweight cursor presence (poll-based, no WebSocket SaaS). */
export interface VisualPresence {
  sessionId: string;
  label: string;
  x: number;
  y: number;
  updatedAt: string;
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
  /** Smart facilitation template (SWOT, 5 Whys, etc.) */
  workshopTemplateId?: string;
  workshop?: WorkshopMeta;
  /** Ephemeral collaborators — expires after ~30s without heartbeat */
  presence?: VisualPresence[];
  createdAt: string;
  updatedAt: string;
}

export type WorkshopStatus = "draft" | "in_progress" | "completed";

export interface WorkshopZoneBinding {
  id: string;
  label: string;
  frameNodeId: string;
}

export interface WorkshopMeta {
  status: WorkshopStatus;
  zones: WorkshopZoneBinding[];
  anchorNodeId?: string;
  recordedAt?: string;
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
  "wireframe",
  "design_system",
  "roadmap",
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
  ...WIREFRAME_NODE_KINDS,
];

export const DEFAULT_STICKY_COLOR = "#fef08a";
export const DEFAULT_FRAME_COLOR = "#334155";

export function defaultViewport(): VisualViewport {
  return { x: 0, y: 0, zoom: 1 };
}
