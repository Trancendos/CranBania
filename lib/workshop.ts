/**
 * Workshop orchestration — link Kanban cards to visual templates,
 * populate zones (AI/human), and record outcomes back to tickets.
 */

import { randomUUID } from "crypto";
import { addComment, getCard, updateCard } from "./board";
import type { Card } from "./types";
import {
  createVisualBoard,
  getVisualBoard,
  listVisualBoards,
  replaceVisualCanvas,
  updateVisualBoard,
} from "./visual-board";
import type { VisualBoard, VisualNode } from "./visual-types";
import {
  buildWorkshopCanvas,
  getWorkshopTemplate,
  listWorkshopTemplates,
  type WorkshopCategory,
  type WorkshopTemplate,
} from "./workshop-templates";

export interface WorkshopSuggestion {
  templateId: string;
  name: string;
  category: WorkshopCategory;
  score: number;
  reason: string;
}

export interface StartWorkshopInput {
  cardId: string;
  templateId: string;
  title?: string;
  actor?: string;
}

export interface PopulateWorkshopInput {
  boardId: string;
  /** zone id → sticky note texts */
  zones: Record<string, string[]>;
  actor?: string;
  replacePlaceholders?: boolean;
}

export interface RecordWorkshopOutcomesInput {
  boardId: string;
  cardId?: string;
  actor?: string;
  updateDescription?: boolean;
  appendTags?: boolean;
  markComplete?: boolean;
}

export interface WorkshopOutcomeSummary {
  templateId: string;
  templateName: string;
  zones: Array<{
    zoneId: string;
    label: string;
    items: string[];
  }>;
}

function scoreTemplate(template: WorkshopTemplate, card: Card): WorkshopSuggestion | null {
  let score = 0;
  const reasons: string[] = [];
  const haystack = `${card.title} ${card.description ?? ""}`.toLowerCase();

  if (template.suggestedCardTypes?.includes(card.cardType)) {
    score += 40;
    reasons.push(`fits ${card.cardType} cards`);
  }

  for (const kw of template.keywords ?? []) {
    if (haystack.includes(kw.toLowerCase())) {
      score += 15;
      reasons.push(`matches "${kw}"`);
    }
  }

  if (card.cardType === "incident" && template.category === "analysis") score += 10;
  if (card.cardType === "feature" && template.category === "brainstorm") score += 8;
  if (card.cardType === "change" && template.category === "planning") score += 8;

  if (score === 0) return null;

  return {
    templateId: template.id,
    name: template.name,
    category: template.category,
    score,
    reason: reasons.slice(0, 3).join("; ") || "general fit",
  };
}

export function suggestWorkshopsForCard(card: Card, limit = 5): WorkshopSuggestion[] {
  const scored = listWorkshopTemplates()
    .map((t) => scoreTemplate(t, card))
    .filter((s): s is WorkshopSuggestion => s !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return listWorkshopTemplates()
      .slice(0, limit)
      .map((t) => ({
        templateId: t.id,
        name: t.name,
        category: t.category,
        score: 1,
        reason: "default suggestion",
      }));
  }

  return scored.slice(0, limit);
}

export async function suggestWorkshopsForCardId(
  cardId: string,
  limit = 5,
): Promise<WorkshopSuggestion[] | null> {
  const card = await getCard(cardId);
  if (!card) return null;
  return suggestWorkshopsForCard(card, limit);
}

export async function startWorkshopFromCard(
  input: StartWorkshopInput,
): Promise<VisualBoard | null> {
  const card = await getCard(input.cardId);
  if (!card) return null;

  const template = getWorkshopTemplate(input.templateId);
  if (!template) return null;

  const canvas = buildWorkshopCanvas(template, {
    cardTitle: card.title,
    cardDescription: card.description,
  });

  const board = await createVisualBoard({
    title: input.title ?? `${template.name}: ${card.title}`,
    description: template.purpose,
    boardType: "whiteboard",
    linkedCardId: card.id,
  });

  await replaceVisualCanvas(board.id, canvas.nodes, canvas.edges);
  await updateVisualBoard(board.id, {
    workshopTemplateId: template.id,
    workshop: {
      status: "in_progress",
      zones: canvas.zones,
      anchorNodeId: canvas.anchorNodeId,
    },
  });

  await addComment(
    card.id,
    `[Workshop started] ${template.name} — visual board linked (${board.id})`,
    input.actor ?? "agent",
  );

  return (await getVisualBoard(board.id)) ?? board;
}

function zoneIdForNode(node: VisualNode, board: VisualBoard): string | undefined {
  const metaZone = node.meta?.zoneId;
  if (typeof metaZone === "string") return metaZone;
  if (node.parentFrameId && board.workshop?.zones) {
    const frame = board.workshop.zones.find((z) => z.frameNodeId === node.parentFrameId);
    return frame?.id;
  }
  return undefined;
}

function stickyPlacementInFrame(
  frame: VisualNode,
  index: number,
  text: string,
  zoneId: string,
  color?: string,
): VisualNode {
  const cols = 2;
  const pad = 16;
  const sw = Math.max(80, (frame.width - pad * 3) / cols);
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
    text,
    color: color ?? "#fef08a",
    parentFrameId: frame.id,
    meta: { zoneId, populatedBy: "workshop" },
  };
}

export async function populateWorkshopZones(
  input: PopulateWorkshopInput,
): Promise<VisualBoard | null> {
  let board = await getVisualBoard(input.boardId);
  if (!board?.workshopTemplateId || !board.workshop) return null;

  const template = getWorkshopTemplate(board.workshopTemplateId);
  if (!template) return null;

  let nodes = [...board.nodes];

  if (input.replacePlaceholders) {
    nodes = nodes.filter((n) => !(n.kind === "sticky" && n.meta?.placeholder));
  }

  for (const [zoneId, texts] of Object.entries(input.zones)) {
    const zoneDef = template.zones.find((z) => z.id === zoneId);
    const binding = board.workshop.zones.find((z) => z.id === zoneId);
    if (!binding || texts.length === 0) continue;

    const frame = nodes.find((n) => n.id === binding.frameNodeId);
    if (!frame) continue;

    const existingInZone = nodes.filter(
      (n) => n.kind === "sticky" && zoneIdForNode(n, board!) === zoneId,
    ).length;

    texts.forEach((text, i) => {
      if (!text.trim()) return;
      nodes.push(
        stickyPlacementInFrame(
          frame,
          existingInZone + i,
          text.trim(),
          zoneId,
          zoneDef?.stickyColor,
        ),
      );
    });
  }

  board = (await replaceVisualCanvas(board.id, nodes, board.edges)) ?? board;
  await updateVisualBoard(board.id, {
    workshop: { ...board.workshop!, status: "in_progress" },
  });

  if (board.linkedCardId) {
    const zoneCount = Object.values(input.zones).reduce((n, arr) => n + arr.length, 0);
    await addComment(
      board.linkedCardId,
      `[Workshop populated] ${template.name}: ${zoneCount} items added to canvas`,
      input.actor ?? "agent",
    );
  }

  return getVisualBoard(board.id);
}

export function extractWorkshopOutcomes(board: VisualBoard): WorkshopOutcomeSummary | null {
  if (!board.workshopTemplateId || !board.workshop) return null;
  const template = getWorkshopTemplate(board.workshopTemplateId);
  if (!template) return null;

  const zones = board.workshop.zones.map((binding) => {
    const items = board.nodes
      .filter((n) => n.kind === "sticky" && !n.meta?.placeholder)
      .filter((n) => zoneIdForNode(n, board) === binding.id)
      .map((n) => n.text.trim())
      .filter(Boolean);
    return {
      zoneId: binding.id,
      label: binding.label,
      items,
    };
  });

  return {
    templateId: template.id,
    templateName: template.name,
    zones,
  };
}

function buildDescriptionAppend(summary: WorkshopOutcomeSummary): string {
  const lines = [`## Workshop: ${summary.templateName}`, ""];
  for (const zone of summary.zones) {
    if (zone.items.length === 0) continue;
    lines.push(`### ${zone.label}`);
    for (const item of zone.items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export async function recordWorkshopOutcomes(
  input: RecordWorkshopOutcomesInput,
): Promise<{ board: VisualBoard; card: Card | null; summary: WorkshopOutcomeSummary } | null> {
  const board = await getVisualBoard(input.boardId);
  if (!board) return null;

  const summary = extractWorkshopOutcomes(board);
  if (!summary) return null;

  const cardId = input.cardId ?? board.linkedCardId;
  let card: Card | null = null;

  if (cardId) {
    card = await getCard(cardId);
    if (card) {
      for (const zone of summary.zones) {
        for (const item of zone.items) {
          await addComment(
            cardId,
            `[Workshop · ${summary.templateName} · ${zone.label}] ${item}`,
            input.actor ?? "agent",
          );
        }
      }

      if (input.updateDescription !== false) {
        const block = buildDescriptionAppend(summary);
        const nextDesc = card.description?.trim()
          ? `${card.description.trim()}\n\n${block}`
          : block;
        card = await updateCard(cardId, {
          description: nextDesc,
          actor: input.actor ?? "agent",
        });
      }

      if (input.appendTags !== false && card) {
        const tagSet = new Set((await getCard(cardId))?.tags ?? card.tags ?? []);
        tagSet.add(`workshop:${summary.templateId}`);
        for (const zone of summary.zones) {
          if (zone.items.length > 0) tagSet.add(`zone:${zone.zoneId}`);
        }
        card = await updateCard(cardId, {
          tags: [...tagSet],
          actor: input.actor ?? "agent",
        });
      }
    }
  }

  const updatedBoard = await updateVisualBoard(board.id, {
    workshop: {
      ...board.workshop!,
      status: input.markComplete !== false ? "completed" : board.workshop!.status,
      recordedAt: new Date().toISOString(),
    },
  });

  if (cardId && card) {
    await addComment(
      cardId,
      `[Workshop recorded] ${summary.templateName} outcomes synced to ticket`,
      input.actor ?? "agent",
    );
  }

  const finalBoard = (await getVisualBoard(board.id)) ?? updatedBoard;
  return {
    board: finalBoard!,
    card,
    summary,
  };
}

export async function listWorkshopsForCard(cardId: string): Promise<VisualBoard[]> {
  return listVisualBoards({ linkedCardId: cardId }).then((boards) =>
    boards.filter((b) => b.workshopTemplateId),
  );
}

export { listWorkshopTemplates, getWorkshopTemplate };
