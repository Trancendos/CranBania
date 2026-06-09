/**
 * Wireframe & UI design-system helpers for visual boards.
 */

import { randomUUID } from "crypto";
import type { VisualNode, VisualNodeKind } from "./visual-types";

export type WireframeComponentKind = Extract<
  VisualNodeKind,
  | "wire_heading"
  | "wire_label"
  | "wire_button"
  | "wire_input"
  | "wire_checkbox"
  | "wire_nav"
  | "wire_image"
  | "wire_card"
  | "wire_divider"
>;

export interface WireframeComponentSpec {
  kind: WireframeComponentKind;
  text?: string;
  /** Offset inside screen frame (auto-stacks if omitted) */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface DesignSystemTokens {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  text: string;
  radius: string;
  fontHeading: string;
  fontBody: string;
}

export const DEFAULT_DESIGN_TOKENS: DesignSystemTokens = {
  primary: "#6366f1",
  secondary: "#64748b",
  accent: "#22d3ee",
  surface: "#1e293b",
  text: "#f8fafc",
  radius: "8px",
  fontHeading: "Inter / system-ui",
  fontBody: "Inter / system-ui",
};

const DEFAULTS: Record<
  WireframeComponentKind,
  { width: number; height: number; text: string; color?: string }
> = {
  wire_heading: { width: 280, height: 36, text: "Page title" },
  wire_label: { width: 120, height: 20, text: "Label" },
  wire_button: { width: 120, height: 36, text: "Button", color: "#6366f1" },
  wire_input: { width: 240, height: 36, text: "Input field", color: "#334155" },
  wire_checkbox: { width: 160, height: 24, text: "☐ Option" },
  wire_nav: { width: 320, height: 48, text: "Nav · Home · Settings", color: "#475569" },
  wire_image: { width: 200, height: 120, text: "Image / hero", color: "#475569" },
  wire_card: { width: 260, height: 100, text: "Card content block", color: "#334155" },
  wire_divider: { width: 280, height: 4, text: "", color: "#64748b" },
};

export function createWireframeNode(
  kind: WireframeComponentKind,
  x: number,
  y: number,
  text?: string,
  size?: { width?: number; height?: number },
  meta?: Record<string, unknown>,
): VisualNode {
  const d = DEFAULTS[kind];
  return {
    id: randomUUID(),
    kind,
    x,
    y,
    width: size?.width ?? d.width,
    height: size?.height ?? d.height,
    text: text ?? d.text,
    color: d.color,
    meta: { ...meta, wireframe: true },
  };
}

/** Standard mobile login screen wireframe stack */
export function defaultMobileWireframeStack(frame: VisualNode): VisualNode[] {
  const pad = 24;
  let y = frame.y + pad + 40;
  const x = frame.x + pad;
  const innerW = frame.width - pad * 2;
  const specs: WireframeComponentSpec[] = [
    { kind: "wire_nav", text: "← Back", width: innerW },
    { kind: "wire_heading", text: "Sign in", width: innerW },
    { kind: "wire_label", text: "Email" },
    { kind: "wire_input", text: "you@example.com", width: innerW },
    { kind: "wire_label", text: "Password" },
    { kind: "wire_input", text: "••••••••", width: innerW },
    { kind: "wire_button", text: "Continue", width: innerW },
    { kind: "wire_divider", width: innerW },
    { kind: "wire_button", text: "Sign up", width: innerW },
  ];

  return specs.map((spec, i) => {
    const node = createWireframeNode(
      spec.kind,
      spec.x ?? x,
      spec.y ?? y,
      spec.text,
      { width: spec.width, height: spec.height },
      { zoneId: "screen", stackIndex: i },
    );
    if (spec.y === undefined) {
      y += node.height + 12;
    }
    node.parentFrameId = frame.id;
    return node;
  });
}

/** Stack wireframe components inside a screen frame */
export function layoutWireframeComponents(
  frame: VisualNode,
  components: WireframeComponentSpec[],
  zoneId = "screen",
): VisualNode[] {
  const pad = 20;
  let y = frame.y + 48;
  const x = frame.x + pad;
  const innerW = frame.width - pad * 2;

  return components.map((spec, i) => {
    const node = createWireframeNode(
      spec.kind,
      spec.x ?? x,
      spec.y ?? y,
      spec.text,
      {
        width: spec.width ?? Math.min(DEFAULTS[spec.kind].width, innerW),
        height: spec.height,
      },
      { zoneId, stackIndex: i, populatedBy: "wireframe" },
    );
    node.parentFrameId = frame.id;
    if (spec.y === undefined) {
      y += node.height + 10;
    }
    return node;
  });
}

export function designTokenStickies(
  frame: VisualNode,
  tokens: DesignSystemTokens,
  zoneId: string,
): VisualNode[] {
  const lines = [
    `Primary ${tokens.primary}`,
    `Secondary ${tokens.secondary}`,
    `Accent ${tokens.accent}`,
    `Surface ${tokens.surface}`,
    `Text ${tokens.text}`,
    `Radius ${tokens.radius}`,
    `Heading ${tokens.fontHeading}`,
    `Body ${tokens.fontBody}`,
  ];
  return lines.map((text, i) => ({
    id: randomUUID(),
    kind: "sticky" as const,
    x: frame.x + 16,
    y: frame.y + 48 + i * 36,
    width: frame.width - 32,
    height: 32,
    text,
    color: i < 5 ? tokens.primary : "#fef08a",
    parentFrameId: frame.id,
    meta: { zoneId, designToken: true },
  }));
}

export const WIREFRAME_COMPONENT_KINDS = Object.keys(DEFAULTS) as WireframeComponentKind[];
