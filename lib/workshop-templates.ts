/**
 * Smart workshop / facilitation templates (Miro/Lucid/FigJam-style).
 * Each template builds a structured canvas AI agents can populate and record back to Kanban cards.
 */

import { randomUUID } from "crypto";
import type { CardType } from "./types";
import {
  DEFAULT_FRAME_COLOR,
  DEFAULT_STICKY_COLOR,
  type VisualEdge,
  type VisualNode,
} from "./visual-types";
import {
  DEFAULT_DESIGN_TOKENS,
  createWireframeNode,
  defaultMobileWireframeStack,
  designTokenStickies,
} from "./wireframe";

export type WorkshopCategory =
  | "brainstorm"
  | "retro"
  | "analysis"
  | "planning"
  | "roadmap"
  | "timeline"
  | "design";

export type WorkshopLayout =
  | "columns"
  | "quadrants"
  | "linear-down"
  | "lean-grid"
  | "timeline"
  | "roadmap-horizontal"
  | "timeline-horizontal"
  | "wireframe-mobile"
  | "wireframe-desktop"
  | "design-system";

export interface WorkshopZoneDef {
  id: string;
  label: string;
  hint?: string;
  stickyColor?: string;
}

export interface WorkshopTemplate {
  id: string;
  name: string;
  category: WorkshopCategory;
  description: string;
  purpose: string;
  zones: WorkshopZoneDef[];
  suggestedCardTypes?: CardType[];
  keywords?: string[];
  layout: WorkshopLayout;
  /** Zones whose stickies become follow-up Kanban cards when recording */
  actionZoneIds?: string[];
  /** Primary screen zone for wireframe population */
  wireframeZoneId?: string;
}

export interface WorkshopCanvasContext {
  cardTitle?: string;
  cardDescription?: string;
}

export interface WorkshopZoneBinding {
  id: string;
  label: string;
  frameNodeId: string;
}

export interface WorkshopCanvasResult {
  nodes: VisualNode[];
  edges: VisualEdge[];
  zones: WorkshopZoneBinding[];
  anchorNodeId?: string;
}

const COL_W = 260;
const COL_H = 340;
const GAP = 36;
const ORIGIN_X = 40;
const ORIGIN_Y = 120;

function anchorText(template: WorkshopTemplate, ctx: WorkshopCanvasContext): string {
  const title = ctx.cardTitle?.trim() || "Workshop topic";
  const desc = ctx.cardDescription?.trim();
  const lines = [`${template.name}`, `Topic: ${title}`, template.purpose];
  if (desc) lines.push(desc.slice(0, 280));
  return lines.join("\n");
}

function frameNode(
  zone: WorkshopZoneDef,
  x: number,
  y: number,
  w: number,
  h: number,
): VisualNode {
  return {
    id: randomUUID(),
    kind: "frame",
    x,
    y,
    width: w,
    height: h,
    text: zone.label,
    color: DEFAULT_FRAME_COLOR,
    meta: { zoneId: zone.id, isZoneFrame: true },
  };
}

function placeholderSticky(
  zone: WorkshopZoneDef,
  frame: VisualNode,
  index: number,
): VisualNode {
  const cols = 2;
  const pad = 16;
  const sw = (frame.width - pad * 3) / cols;
  const sh = 72;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    id: randomUUID(),
    kind: "sticky",
    x: frame.x + pad + col * (sw + pad),
    y: frame.y + 48 + row * (sh + 12),
    width: sw,
    height: sh,
    text: zone.hint ?? "Add notes…",
    color: zone.stickyColor ?? DEFAULT_STICKY_COLOR,
    parentFrameId: frame.id,
    meta: { zoneId: zone.id, placeholder: true },
  };
}

function columnsLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 24,
    width: Math.max(400, template.zones.length * (COL_W + GAP) - GAP),
    height: 72,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  template.zones.forEach((zone, i) => {
    const x = ORIGIN_X + i * (COL_W + GAP);
    const frame = frameNode(zone, x, ORIGIN_Y, COL_W, COL_H);
    nodes.push(frame);
    nodes.push(placeholderSticky(zone, frame, 0));
    nodes.push(placeholderSticky(zone, frame, 1));
    zones.push({ id: zone.id, label: zone.label, frameNodeId: frame.id });
  });

  return { nodes, edges: [], zones, anchorNodeId: anchorId };
}

function quadrantsLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const qw = 300;
  const qh = 280;
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 24,
    width: qw * 2 + GAP,
    height: 72,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  const positions = [
    { x: ORIGIN_X, y: ORIGIN_Y },
    { x: ORIGIN_X + qw + GAP, y: ORIGIN_Y },
    { x: ORIGIN_X, y: ORIGIN_Y + qh + GAP },
    { x: ORIGIN_X + qw + GAP, y: ORIGIN_Y + qh + GAP },
  ];

  template.zones.slice(0, 4).forEach((zone, i) => {
    const pos = positions[i];
    const frame = frameNode(zone, pos.x, pos.y, qw, qh);
    nodes.push(frame);
    nodes.push(placeholderSticky(zone, frame, 0));
    zones.push({ id: zone.id, label: zone.label, frameNodeId: frame.id });
  });

  return { nodes, edges: [], zones, anchorNodeId: anchorId };
}

function linearDownLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const lw = 320;
  const lh = 88;
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 24,
    width: lw,
    height: 64,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  let prevId: string | null = null;
  template.zones.forEach((zone, i) => {
    const y = ORIGIN_Y + i * (lh + 24);
    const isProblem = i === 0;
    const shape: VisualNode = {
      id: randomUUID(),
      kind: isProblem ? "rectangle" : "rectangle",
      x: ORIGIN_X,
      y,
      width: lw,
      height: lh,
      text: `${zone.label}${zone.hint ? `\n${zone.hint}` : ""}`,
      color: isProblem ? "#fca5a5" : "#e2e8f0",
      meta: { zoneId: zone.id, isZoneFrame: true },
    };
    nodes.push(shape);
    if (!isProblem) {
      nodes.push(placeholderSticky(zone, { ...shape, width: lw - 32, height: lh - 40, x: shape.x + 16, y: shape.y + 36 }, 0));
    }
    zones.push({ id: zone.id, label: zone.label, frameNodeId: shape.id });
    if (prevId) {
      edges.push({
        id: randomUUID(),
        fromNodeId: prevId,
        toNodeId: shape.id,
        label: "why?",
      });
    }
    prevId = shape.id;
  });

  return { nodes, edges, zones, anchorNodeId: anchorId };
}

function leanGridLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const cw = 220;
  const ch = 160;
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 16,
    width: cw * 3 + GAP * 2,
    height: 56,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  const grid = [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ];

  template.zones.slice(0, 9).forEach((zone, i) => {
    const [col, row] = grid[i];
    const x = ORIGIN_X + col * (cw + GAP);
    const y = ORIGIN_Y + row * (ch + GAP);
    const frame = frameNode(zone, x, y, cw, ch);
    nodes.push(frame);
    nodes.push(placeholderSticky(zone, frame, 0));
    zones.push({ id: zone.id, label: zone.label, frameNodeId: frame.id });
  });

  return { nodes, edges: [], zones, anchorNodeId: anchorId };
}

function timelineLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const laneH = 100;
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 16,
    width: 900,
    height: 56,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  template.zones.forEach((zone, i) => {
    const frame = frameNode(zone, ORIGIN_X, ORIGIN_Y + i * (laneH + 20), 880, laneH);
    nodes.push(frame);
    nodes.push(placeholderSticky(zone, frame, 0));
    nodes.push(placeholderSticky(zone, frame, 1));
    nodes.push(placeholderSticky(zone, frame, 2));
    zones.push({ id: zone.id, label: zone.label, frameNodeId: frame.id });
  });

  return { nodes, edges: [], zones, anchorNodeId: anchorId };
}

function roadmapHorizontalLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const sw = 220;
  const sh = 320;
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 16,
    width: template.zones.length * (sw + GAP),
    height: 56,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  template.zones.forEach((zone, i) => {
    const x = ORIGIN_X + i * (sw + GAP);
    const frame = frameNode(zone, x, ORIGIN_Y, sw, sh);
    nodes.push(frame);
    nodes.push(placeholderSticky(zone, frame, 0));
    nodes.push(placeholderSticky(zone, frame, 1));
    zones.push({ id: zone.id, label: zone.label, frameNodeId: frame.id });
    if (i > 0) {
      const prev = zones[i - 1];
      edges.push({
        id: randomUUID(),
        fromNodeId: prev.frameNodeId,
        toNodeId: frame.id,
        style: "dashed",
      });
    }
  });

  return { nodes, edges, zones, anchorNodeId: anchorId };
}

function timelineHorizontalLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const pw = 180;
  const ph = 200;
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 16,
    width: 900,
    height: 56,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  template.zones.forEach((zone, i) => {
    const x = ORIGIN_X + i * (pw + 24);
    const frame = frameNode(zone, x, ORIGIN_Y + 40, pw, ph);
    nodes.push(frame);
    nodes.push(placeholderSticky(zone, frame, 0));
    zones.push({ id: zone.id, label: zone.label, frameNodeId: frame.id });
    if (i > 0) {
      edges.push({
        id: randomUUID(),
        fromNodeId: zones[i - 1].frameNodeId,
        toNodeId: frame.id,
        label: "→",
      });
    }
  });

  const axisY = ORIGIN_Y + 20;
  nodes.push({
    id: randomUUID(),
    kind: "rectangle",
    x: ORIGIN_X,
    y: axisY,
    width: template.zones.length * (pw + 24) - 24,
    height: 4,
    text: "",
    color: "#64748b",
    meta: { timelineAxis: true },
  });

  return { nodes, edges, zones, anchorNodeId: anchorId };
}

function wireframeMobileLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 16,
    width: 700,
    height: 56,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  const screenZone = template.zones.find((z) => z.id === "screen") ?? template.zones[0];
  const screenFrame = frameNode(screenZone, ORIGIN_X + 40, ORIGIN_Y, 360, 640);
  nodes.push(screenFrame);
  nodes.push(...defaultMobileWireframeStack(screenFrame));
  zones.push({ id: screenZone.id, label: screenZone.label, frameNodeId: screenFrame.id });

  const notesZone = template.zones.find((z) => z.id === "annotations");
  if (notesZone) {
    const notesFrame = frameNode(notesZone, ORIGIN_X + 440, ORIGIN_Y, 280, 640);
    nodes.push(notesFrame);
    nodes.push(placeholderSticky(notesZone, notesFrame, 0));
    nodes.push(placeholderSticky(notesZone, notesFrame, 1));
    zones.push({ id: notesZone.id, label: notesZone.label, frameNodeId: notesFrame.id });
  }

  return { nodes, edges: [], zones, anchorNodeId: anchorId };
}

function wireframeDesktopLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 16,
    width: 900,
    height: 56,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  const chrome = frameNode(
    { id: "chrome", label: "Browser / app chrome" },
    ORIGIN_X,
    ORIGIN_Y,
    900,
    520,
  );
  nodes.push(chrome);

  const sidebar = frameNode(
    template.zones.find((z) => z.id === "sidebar") ?? { id: "sidebar", label: "Sidebar" },
    ORIGIN_X + 16,
    ORIGIN_Y + 48,
    180,
    440,
  );
  nodes.push(sidebar);
  zones.push({ id: "sidebar", label: "Sidebar", frameNodeId: sidebar.id });

  const main = frameNode(
    template.zones.find((z) => z.id === "main") ?? { id: "main", label: "Main content" },
    ORIGIN_X + 210,
    ORIGIN_Y + 48,
    674,
    440,
  );
  nodes.push(main);
  zones.push({ id: "main", label: "Main content", frameNodeId: main.id });

  nodes.push(
    createWireframeNode("wire_nav", main.x + 16, main.y + 16, "App · Dashboard · Settings", {
      width: main.width - 32,
    }),
  );
  nodes.push(
    createWireframeNode("wire_heading", main.x + 16, main.y + 72, ctx.cardTitle ?? "Page title", {
      width: 320,
    }),
  );
  nodes.push(
    createWireframeNode("wire_card", main.x + 16, main.y + 120, "Primary content area", {
      width: main.width - 32,
      height: 200,
    }),
  );

  for (const n of nodes.slice(-3)) {
    n.parentFrameId = main.id;
  }

  return { nodes, edges: [], zones, anchorNodeId: anchorId };
}

function designSystemLayout(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext,
): WorkshopCanvasResult {
  const nodes: VisualNode[] = [];
  const zones: WorkshopZoneBinding[] = [];
  const cw = 260;
  const ch = 200;
  const anchorId = randomUUID();
  nodes.push({
    id: anchorId,
    kind: "text",
    x: ORIGIN_X,
    y: 16,
    width: cw * 3 + GAP * 2,
    height: 56,
    text: anchorText(template, ctx),
    meta: { isAnchor: true },
  });

  template.zones.forEach((zone, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = ORIGIN_X + col * (cw + GAP);
    const y = ORIGIN_Y + row * (ch + GAP);
    const frame = frameNode(zone, x, y, cw, ch);
    nodes.push(frame);
    if (zone.id === "colors" || zone.id === "typography") {
      nodes.push(...designTokenStickies(frame, DEFAULT_DESIGN_TOKENS, zone.id));
    } else {
      nodes.push(placeholderSticky(zone, frame, 0));
    }
    zones.push({ id: zone.id, label: zone.label, frameNodeId: frame.id });
  });

  return { nodes, edges: [], zones, anchorNodeId: anchorId };
}

export function buildWorkshopCanvas(
  template: WorkshopTemplate,
  ctx: WorkshopCanvasContext = {},
): WorkshopCanvasResult {
  switch (template.layout) {
    case "quadrants":
      return quadrantsLayout(template, ctx);
    case "linear-down":
      return linearDownLayout(template, ctx);
    case "lean-grid":
      return leanGridLayout(template, ctx);
    case "timeline":
      return timelineLayout(template, ctx);
    case "roadmap-horizontal":
      return roadmapHorizontalLayout(template, ctx);
    case "timeline-horizontal":
      return timelineHorizontalLayout(template, ctx);
    case "wireframe-mobile":
      return wireframeMobileLayout(template, ctx);
    case "wireframe-desktop":
      return wireframeDesktopLayout(template, ctx);
    case "design-system":
      return designSystemLayout(template, ctx);
    default:
      return columnsLayout(template, ctx);
  }
}

export const WORKSHOP_TEMPLATES: WorkshopTemplate[] = [
  {
    id: "open-brainstorm",
    name: "Open Brainstorm",
    category: "brainstorm",
    description: "Divergent ideation around a single challenge",
    purpose: "Generate many ideas, then cluster and prioritize.",
    layout: "columns",
    suggestedCardTypes: ["feature", "task"],
    keywords: ["brainstorm", "ideas", "explore", "creative"],
    zones: [
      { id: "context", label: "Context / challenge", hint: "Restate the problem" },
      { id: "ideas", label: "Ideas", hint: "Quantity over quality" },
      { id: "themes", label: "Themes", hint: "Group similar ideas" },
      { id: "picks", label: "Top picks", hint: "Best candidates", stickyColor: "#bbf7d0" },
    ],
    actionZoneIds: ["picks"],
  },
  {
    id: "ideastorm",
    name: "Ideastorm",
    category: "brainstorm",
    description: "Rapid quantity-first ideation with selection",
    purpose: "Storm ideas quickly, vote, and refine winners.",
    layout: "columns",
    suggestedCardTypes: ["feature", "task"],
    keywords: ["ideastorm", "storm", "rapid", "innovation"],
    zones: [
      { id: "prompt", label: "Prompt", hint: "What are we solving?" },
      { id: "rapid", label: "Rapid ideas", hint: "One idea per sticky" },
      { id: "vote", label: "Shortlist", hint: "Dot-vote winners", stickyColor: "#fde68a" },
      { id: "refine", label: "Refined concepts", hint: "Expand top picks", stickyColor: "#bbf7d0" },
    ],
    actionZoneIds: ["refine"],
  },
  {
    id: "five-whys",
    name: "5 Whys",
    category: "analysis",
    description: "Root-cause analysis by chaining why questions",
    purpose: "Find the underlying cause and define corrective action.",
    layout: "linear-down",
    suggestedCardTypes: ["bug", "incident", "change"],
    keywords: ["root cause", "why", "incident", "failure", "rca"],
    zones: [
      { id: "problem", label: "Problem statement", hint: "What happened?" },
      { id: "why-1", label: "Why 1?", hint: "First why" },
      { id: "why-2", label: "Why 2?" },
      { id: "why-3", label: "Why 3?" },
      { id: "why-4", label: "Why 4?" },
      { id: "why-5", label: "Why 5 / root cause" },
      { id: "action", label: "Corrective action", hint: "What will we do?", stickyColor: "#bbf7d0" },
    ],
    actionZoneIds: ["action"],
  },
  {
    id: "good-bad-ugly",
    name: "Good / Bad / Ugly",
    category: "retro",
    description: "Sprint reflection with emotional lens",
    purpose: "Capture positives, pain points, and messy areas.",
    layout: "columns",
    suggestedCardTypes: ["task", "feature", "bug"],
    keywords: ["retro", "review", "feedback", "sprint"],
    zones: [
      { id: "good", label: "Good", stickyColor: "#bbf7d0" },
      { id: "bad", label: "Bad", stickyColor: "#fecaca" },
      { id: "ugly", label: "Ugly", stickyColor: "#fde68a" },
      { id: "actions", label: "Actions", hint: "What we will change", stickyColor: "#93c5fd" },
    ],
    actionZoneIds: ["actions"],
  },
  {
    id: "swot",
    name: "SWOT Analysis",
    category: "analysis",
    description: "Strengths, weaknesses, opportunities, threats",
    purpose: "Strategic snapshot for decisions and planning.",
    layout: "quadrants",
    suggestedCardTypes: ["feature", "change", "task"],
    keywords: ["swot", "strategy", "competitive", "planning"],
    zones: [
      { id: "strengths", label: "Strengths", stickyColor: "#bbf7d0" },
      { id: "weaknesses", label: "Weaknesses", stickyColor: "#fecaca" },
      { id: "opportunities", label: "Opportunities", stickyColor: "#93c5fd" },
      { id: "threats", label: "Threats", stickyColor: "#fde68a" },
    ],
  },
  {
    id: "start-stop-continue",
    name: "Start / Stop / Continue",
    category: "retro",
    description: "Fast behavioral and process feedback",
    purpose: "Agree what to start, stop, and keep doing.",
    layout: "columns",
    suggestedCardTypes: ["task", "change"],
    keywords: ["retro", "process", "team", "improve"],
    zones: [
      { id: "start", label: "Start", stickyColor: "#bbf7d0" },
      { id: "stop", label: "Stop", stickyColor: "#fecaca" },
      { id: "continue", label: "Continue", stickyColor: "#93c5fd" },
    ],
  },
  {
    id: "fishbone",
    name: "Fishbone / Ishikawa",
    category: "analysis",
    description: "Categorize causes of a defect or incident",
    purpose: "Map causes across people, process, tools, and data.",
    layout: "columns",
    suggestedCardTypes: ["bug", "incident"],
    keywords: ["fishbone", "ishikawa", "cause", "defect"],
    zones: [
      { id: "problem", label: "Problem", hint: "Head of the fish" },
      { id: "people", label: "People" },
      { id: "process", label: "Process" },
      { id: "tools", label: "Tools / tech" },
      { id: "data", label: "Data" },
      { id: "environment", label: "Environment" },
    ],
  },
  {
    id: "impact-effort",
    name: "Impact vs Effort",
    category: "planning",
    description: "Prioritize initiatives on a 2×2 matrix",
    purpose: "Find quick wins and avoid low-value work.",
    layout: "quadrants",
    suggestedCardTypes: ["feature", "task"],
    keywords: ["prioritize", "backlog", "impact", "effort", "matrix"],
    zones: [
      { id: "quick-wins", label: "Quick wins (high impact, low effort)", stickyColor: "#bbf7d0" },
      { id: "major", label: "Major projects (high / high)" },
      { id: "fill-ins", label: "Fill-ins (low / low)" },
      { id: "avoid", label: "Avoid (low impact, high effort)", stickyColor: "#fecaca" },
    ],
  },
  {
    id: "pros-cons",
    name: "Pros & Cons",
    category: "analysis",
    description: "Compare options before a decision",
    purpose: "Balance benefits and drawbacks, then decide next steps.",
    layout: "columns",
    suggestedCardTypes: ["change", "feature"],
    keywords: ["decision", "compare", "tradeoff", "option"],
    zones: [
      { id: "pros", label: "Pros", stickyColor: "#bbf7d0" },
      { id: "cons", label: "Cons", stickyColor: "#fecaca" },
      { id: "next", label: "Decision / next steps", stickyColor: "#93c5fd" },
    ],
  },
  {
    id: "premortem",
    name: "Premortem",
    category: "planning",
    description: "Imagine future failure and prevent it",
    purpose: "Surface risks before delivery and define mitigations.",
    layout: "columns",
    suggestedCardTypes: ["feature", "change"],
    keywords: ["risk", "premortem", "failure", "mitigation"],
    zones: [
      { id: "goal", label: "Project goal", hint: "What success looks like" },
      { id: "failures", label: "Failure scenarios", stickyColor: "#fecaca" },
      { id: "themes", label: "Risk themes" },
      { id: "mitigations", label: "Mitigations", stickyColor: "#bbf7d0" },
    ],
  },
  {
    id: "empathy-map",
    name: "Empathy Map",
    category: "analysis",
    description: "Persona mindset: says, thinks, does, feels, pains, gains",
    purpose: "Build user empathy before designing solutions.",
    layout: "columns",
    suggestedCardTypes: ["feature"],
    keywords: ["user", "persona", "empathy", "customer", "ux"],
    zones: [
      { id: "says", label: "Says" },
      { id: "thinks", label: "Thinks" },
      { id: "does", label: "Does" },
      { id: "feels", label: "Feels" },
      { id: "pains", label: "Pains", stickyColor: "#fecaca" },
      { id: "gains", label: "Gains", stickyColor: "#bbf7d0" },
    ],
  },
  {
    id: "user-story-map",
    name: "User Story Map",
    category: "planning",
    description: "Journey backbone with tasks and release slices",
    purpose: "Align user activities with backlog slices.",
    layout: "columns",
    suggestedCardTypes: ["feature"],
    keywords: ["story map", "journey", "backbone", "release"],
    zones: [
      { id: "activity-1", label: "Activity 1" },
      { id: "activity-2", label: "Activity 2" },
      { id: "activity-3", label: "Activity 3" },
      { id: "release-1", label: "Release 1 (MVP)", stickyColor: "#bbf7d0" },
      { id: "release-2", label: "Release 2" },
    ],
  },
  {
    id: "raci-matrix",
    name: "RACI Matrix",
    category: "planning",
    description: "Clarify Responsible, Accountable, Consulted, Informed",
    purpose: "Assign roles per deliverable before execution.",
    layout: "columns",
    suggestedCardTypes: ["change", "task"],
    keywords: ["raci", "roles", "ownership", "stakeholder"],
    zones: [
      { id: "deliverable", label: "Deliverables", hint: "Rows of work" },
      { id: "responsible", label: "Responsible (R)" },
      { id: "accountable", label: "Accountable (A)" },
      { id: "consulted", label: "Consulted (C)" },
      { id: "informed", label: "Informed (I)" },
    ],
  },
  {
    id: "lean-canvas",
    name: "Lean Canvas",
    category: "planning",
    description: "One-page business model (9 blocks)",
    purpose: "Capture problem, solution, metrics, and advantage.",
    layout: "lean-grid",
    suggestedCardTypes: ["feature"],
    keywords: ["lean", "startup", "business model", "hypothesis"],
    zones: [
      { id: "problem", label: "Problem" },
      { id: "segments", label: "Customer segments" },
      { id: "uvp", label: "Unique value prop" },
      { id: "solution", label: "Solution" },
      { id: "channels", label: "Channels" },
      { id: "revenue", label: "Revenue streams" },
      { id: "costs", label: "Cost structure" },
      { id: "metrics", label: "Key metrics" },
      { id: "advantage", label: "Unfair advantage" },
    ],
  },
  {
    id: "event-storming-lite",
    name: "Event Storming (Lite)",
    category: "analysis",
    description: "Process timeline with events, commands, and hotspots",
    purpose: "Map domain flow without full DDD ceremony.",
    layout: "timeline",
    suggestedCardTypes: ["feature", "change"],
    keywords: ["event", "process", "domain", "workflow"],
    zones: [
      { id: "events", label: "Domain events", stickyColor: "#fde68a" },
      { id: "commands", label: "Commands", stickyColor: "#93c5fd" },
      { id: "actors", label: "Actors / systems" },
      { id: "hotspots", label: "Hotspots / questions", stickyColor: "#fecaca" },
    ],
  },
  {
    id: "brainwriting-635",
    name: "Brainwriting 6-3-5 (lite)",
    category: "brainstorm",
    description: "Silent structured ideation in rounds",
    purpose: "Inclusive ideation without groupthink.",
    layout: "columns",
    suggestedCardTypes: ["feature", "task"],
    keywords: ["brainwriting", "silent", "rounds"],
    zones: [
      { id: "round-1", label: "Round 1" },
      { id: "round-2", label: "Round 2" },
      { id: "round-3", label: "Round 3" },
      { id: "synthesis", label: "Synthesis", stickyColor: "#bbf7d0" },
    ],
  },
  {
    id: "crazy-eights",
    name: "Crazy 8s",
    category: "brainstorm",
    description: "Eight rapid concept variants",
    purpose: "Force breadth before converging on a design.",
    layout: "columns",
    suggestedCardTypes: ["feature"],
    keywords: ["sketch", "design", "variants", "rapid"],
    zones: [
      { id: "concepts-1", label: "Concepts 1–4" },
      { id: "concepts-2", label: "Concepts 5–8" },
      { id: "top-three", label: "Top 3", stickyColor: "#bbf7d0" },
    ],
    actionZoneIds: ["top-three"],
  },
  {
    id: "product-roadmap",
    name: "Product Roadmap (Now / Next / Later)",
    category: "roadmap",
    description: "Horizon-based product roadmap swimlanes",
    purpose: "Sequence initiatives across delivery horizons.",
    layout: "roadmap-horizontal",
    suggestedCardTypes: ["feature", "change"],
    keywords: ["roadmap", "now next later", "horizon", "product"],
    actionZoneIds: ["now", "next"],
    zones: [
      { id: "now", label: "Now", stickyColor: "#bbf7d0" },
      { id: "next", label: "Next", stickyColor: "#93c5fd" },
      { id: "later", label: "Later" },
      { id: "ideas", label: "Ideas / parking lot", stickyColor: "#fde68a" },
    ],
  },
  {
    id: "quarterly-roadmap",
    name: "Quarterly Roadmap",
    category: "roadmap",
    description: "Quarter-by-quarter delivery plan",
    purpose: "Align epics and milestones to fiscal quarters.",
    layout: "roadmap-horizontal",
    suggestedCardTypes: ["feature"],
    keywords: ["quarter", "q1", "q2", "roadmap", "plan"],
    zones: [
      { id: "q1", label: "Q1" },
      { id: "q2", label: "Q2" },
      { id: "q3", label: "Q3" },
      { id: "q4", label: "Q4" },
    ],
  },
  {
    id: "release-timeline",
    name: "Release Timeline",
    category: "timeline",
    description: "Phased release timeline left-to-right",
    purpose: "Map milestones, dependencies, and launch phases.",
    layout: "timeline-horizontal",
    suggestedCardTypes: ["feature", "change"],
    keywords: ["timeline", "release", "milestone", "phase", "launch"],
    zones: [
      { id: "phase-1", label: "Phase 1 · Discovery" },
      { id: "phase-2", label: "Phase 2 · Build" },
      { id: "phase-3", label: "Phase 3 · Beta" },
      { id: "phase-4", label: "Phase 4 · GA" },
    ],
  },
  {
    id: "gantt-lite",
    name: "Gantt Chart (Lite)",
    category: "timeline",
    description: "Week-based task lanes without heavy PM tooling",
    purpose: "Visualize parallel workstreams across weeks.",
    layout: "columns",
    suggestedCardTypes: ["task", "feature"],
    keywords: ["gantt", "schedule", "weeks", "parallel"],
    zones: [
      { id: "week-1", label: "Week 1" },
      { id: "week-2", label: "Week 2" },
      { id: "week-3", label: "Week 3" },
      { id: "week-4", label: "Week 4" },
    ],
  },
  {
    id: "moscow",
    name: "MoSCoW Prioritization",
    category: "planning",
    description: "Must / Should / Could / Won't prioritization",
    purpose: "Scope features for a release or sprint.",
    layout: "columns",
    suggestedCardTypes: ["feature", "task"],
    keywords: ["moscow", "must", "should", "prioritize", "scope"],
    actionZoneIds: ["must", "should"],
    zones: [
      { id: "must", label: "Must have", stickyColor: "#bbf7d0" },
      { id: "should", label: "Should have", stickyColor: "#93c5fd" },
      { id: "could", label: "Could have" },
      { id: "wont", label: "Won't have", stickyColor: "#fecaca" },
    ],
  },
  {
    id: "okr-board",
    name: "OKR Board",
    category: "planning",
    description: "Objectives and key results alignment",
    purpose: "Connect card work to measurable outcomes.",
    layout: "columns",
    suggestedCardTypes: ["feature"],
    keywords: ["okr", "objective", "key result", "goal"],
    zones: [
      { id: "objective", label: "Objective", hint: "Qualitative goal" },
      { id: "kr-1", label: "Key result 1" },
      { id: "kr-2", label: "Key result 2" },
      { id: "kr-3", label: "Key result 3" },
      { id: "initiatives", label: "Initiatives", stickyColor: "#bbf7d0" },
    ],
    actionZoneIds: ["initiatives"],
  },
  {
    id: "wireframe-mobile",
    name: "Mobile Wireframe",
    category: "design",
    description: "Phone canvas with UX annotation column",
    purpose: "Low-fi mobile UI flows linked to feature cards.",
    layout: "wireframe-mobile",
    wireframeZoneId: "screen",
    suggestedCardTypes: ["feature"],
    keywords: ["wireframe", "mobile", "ui", "ux", "mockup", "screen"],
    zones: [
      { id: "screen", label: "Mobile screen" },
      { id: "annotations", label: "UX annotations", hint: "Notes & open questions" },
    ],
  },
  {
    id: "wireframe-desktop",
    name: "Desktop Wireframe",
    category: "design",
    description: "Browser layout with sidebar and main panel",
    purpose: "Desktop app or dashboard wireframes.",
    layout: "wireframe-desktop",
    wireframeZoneId: "main",
    suggestedCardTypes: ["feature"],
    keywords: ["wireframe", "desktop", "dashboard", "web app", "ui"],
    zones: [
      { id: "sidebar", label: "Sidebar navigation" },
      { id: "main", label: "Main content" },
    ],
  },
  {
    id: "ui-design-system",
    name: "UI Design System",
    category: "design",
    description: "Colors, typography, components, and spacing tokens",
    purpose: "Document a product design system on canvas.",
    layout: "design-system",
    suggestedCardTypes: ["feature"],
    keywords: ["design system", "tokens", "typography", "components", "style guide"],
    zones: [
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
      { id: "buttons", label: "Buttons" },
      { id: "forms", label: "Forms & inputs" },
      { id: "navigation", label: "Navigation" },
      { id: "feedback", label: "Feedback & states" },
    ],
  },
  {
    id: "component-library",
    name: "Component Library",
    category: "design",
    description: "Catalog UI patterns for reuse",
    purpose: "Inventory buttons, cards, modals, and lists for dev handoff.",
    layout: "columns",
    suggestedCardTypes: ["feature", "task"],
    keywords: ["component", "library", "pattern", "ui kit"],
    zones: [
      { id: "buttons", label: "Buttons" },
      { id: "forms", label: "Form controls" },
      { id: "data-display", label: "Data display" },
      { id: "navigation", label: "Navigation" },
      { id: "overlays", label: "Modals & overlays" },
    ],
  },
];

export function resolveActionZoneIds(template: WorkshopTemplate): string[] {
  if (template.actionZoneIds?.length) return template.actionZoneIds;
  return template.zones
    .filter((z) =>
      /action|mitigation|next|start|pick|top|quick|must|should|initiative|now/i.test(z.id),
    )
    .map((z) => z.id);
}

export const WORKSHOP_TEMPLATE_IDS = WORKSHOP_TEMPLATES.map((t) => t.id);

export function getWorkshopTemplate(id: string): WorkshopTemplate | undefined {
  return WORKSHOP_TEMPLATES.find((t) => t.id === id);
}

export function listWorkshopTemplates(filters?: {
  category?: WorkshopCategory;
}): WorkshopTemplate[] {
  let list = WORKSHOP_TEMPLATES;
  if (filters?.category) {
    list = list.filter((t) => t.category === filters.category);
  }
  return list;
}
