/**
 * Workshop orchestration — link Kanban cards to visual templates,
 * populate zones (AI/human), and record outcomes back to tickets.
 */

import { randomUUID } from "crypto";
import { addComment, createCard, getCard, updateCard } from "./board";
import { emitCardEvent } from "./services/event-bus";
import type { Card } from "./types";
import { cardToWebhookPayload } from "./webhooks";
import {
  layoutWireframeComponents,
  type WireframeComponentSpec,
} from "./wireframe";
import {
  createVisualBoard,
  getVisualBoard,
  listVisualBoards,
  replaceVisualCanvas,
  updateVisualBoard,
} from "./visual-board";
import type { VisualBoard, VisualBoardType, VisualNode } from "./visual-types";
import {
  buildWorkshopCanvas,
  getWorkshopTemplate,
  listWorkshopTemplates,
  resolveActionZoneIds,
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
  createFollowUpCards?: boolean;
  emitWebhook?: boolean;
}

export interface RunWorkshopForCardInput {
  cardId: string;
  templateId?: string;
  title?: string;
  actor?: string;
  zones?: Record<string, string[]>;
  wireframeComponents?: WireframeComponentSpec[];
  wireframeZoneId?: string;
  replacePlaceholders?: boolean;
  record?: boolean;
  createFollowUpCards?: boolean;
  emitWebhook?: boolean;
  updateDescription?: boolean;
  appendTags?: boolean;
}

export interface RunWorkshopForCardResult {
  board: VisualBoard;
  templateId: string;
  suggestion?: WorkshopSuggestion;
  recorded?: {
    board: VisualBoard;
    card: Card | null;
    summary: WorkshopOutcomeSummary;
    followUpCardIds: string[];
  } | null;
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
  if (card.cardType === "feature" && template.category === "design") score += 12;
  if (card.cardType === "feature" && template.category === "roadmap") score += 10;
  if (/roadmap|timeline|wireframe|ui|ux|design/i.test(haystack)) {
    if (template.category === "roadmap" || template.category === "timeline") score += 12;
    if (template.category === "design") score += 12;
  }

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

function boardTypeForTemplate(template: WorkshopTemplate): VisualBoardType {
  if (template.id === "ui-design-system") return "design_system";
  if (template.category === "design" && template.layout.startsWith("wireframe")) return "wireframe";
  if (template.category === "roadmap") return "roadmap";
  return "whiteboard";
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
    boardType: boardTypeForTemplate(template),
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

export async function populateWorkshopWireframe(input: {
  boardId: string;
  zoneId?: string;
  components: WireframeComponentSpec[];
  actor?: string;
  replaceExisting?: boolean;
}): Promise<VisualBoard | null> {
  let board = await getVisualBoard(input.boardId);
  if (!board?.workshopTemplateId || !board.workshop) return null;

  const template = getWorkshopTemplate(board.workshopTemplateId);
  if (!template) return null;

  const zoneId = input.zoneId ?? template.wireframeZoneId ?? "screen";
  const binding = board.workshop.zones.find((z) => z.id === zoneId);
  if (!binding) return null;

  let nodes = [...board.nodes];
  if (input.replaceExisting) {
    nodes = nodes.filter(
      (n) => !(n.kind.startsWith("wire_") && zoneIdForNode(n, board!) === zoneId),
    );
  }

  const frame = nodes.find((n) => n.id === binding.frameNodeId);
  if (!frame) return null;

  nodes.push(...layoutWireframeComponents(frame, input.components, zoneId));
  board = (await replaceVisualCanvas(board.id, nodes, board.edges)) ?? board;

  if (board.linkedCardId) {
    await addComment(
      board.linkedCardId,
      `[Wireframe populated] ${input.components.length} components on ${zoneId}`,
      input.actor ?? "agent",
    );
  }

  return getVisualBoard(board.id);
}

async function createFollowUpCardsFromWorkshop(
  parentCardId: string,
  summary: WorkshopOutcomeSummary,
  template: WorkshopTemplate,
  actor: string,
): Promise<string[]> {
  const parent = await getCard(parentCardId);
  if (!parent) return [];

  const actionZones = resolveActionZoneIds(template);
  const ids: string[] = [];

  for (const zone of summary.zones) {
    if (!actionZones.includes(zone.zoneId)) continue;
    for (const item of zone.items) {
      const child = await createCard({
        title: item.slice(0, 120),
        description: `Follow-up from **${summary.templateName}** (${zone.label}).\n\nParent card: ${parent.title} (${parentCardId})`,
        columnId: "backlog",
        cardType: parent.cardType === "incident" ? "task" : parent.cardType,
        tags: [
          `workshop-follow-up:${summary.templateId}`,
          `parent:${parentCardId}`,
          `zone:${zone.zoneId}`,
        ],
        epicId: parent.epicId,
        sprintId: parent.sprintId,
      });
      await addComment(
        parentCardId,
        `[Workshop follow-up created] ${child.title} (${child.id})`,
        actor,
      );
      ids.push(child.id);
    }
  }

  return ids;
}

async function emitWorkshopCompletedWebhook(
  card: Card,
  board: VisualBoard,
  summary: WorkshopOutcomeSummary,
  followUpCardIds: string[],
): Promise<void> {
  const itemCount = summary.zones.reduce((n, z) => n + z.items.length, 0);
  await emitCardEvent({
    event: "workshop.completed",
    at: new Date().toISOString(),
    card: cardToWebhookPayload(card),
    workshop: {
      boardId: board.id,
      templateId: summary.templateId,
      templateName: summary.templateName,
      zoneCount: summary.zones.filter((z) => z.items.length > 0).length,
      itemCount,
      followUpCardIds: followUpCardIds.length ? followUpCardIds : undefined,
    },
  });
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
): Promise<{
  board: VisualBoard;
  card: Card | null;
  summary: WorkshopOutcomeSummary;
  followUpCardIds: string[];
} | null> {
  const board = await getVisualBoard(input.boardId);
  if (!board) return null;

  const summary = extractWorkshopOutcomes(board);
  if (!summary) return null;

  const template = getWorkshopTemplate(summary.templateId);
  const cardId = input.cardId ?? board.linkedCardId;
  let card: Card | null = null;
  let followUpCardIds: string[] = [];

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

      if (input.createFollowUpCards !== false && template) {
        followUpCardIds = await createFollowUpCardsFromWorkshop(
          cardId,
          summary,
          template,
          input.actor ?? "agent",
        );
      }
    }
  }

  await updateVisualBoard(board.id, {
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

  const finalBoard = (await getVisualBoard(board.id))!;
  const finalCard = cardId ? await getCard(cardId) : card;

  if (input.emitWebhook !== false && finalCard) {
    await emitWorkshopCompletedWebhook(finalCard, finalBoard, summary, followUpCardIds);
  }

  return {
    board: finalBoard,
    card: finalCard,
    summary,
    followUpCardIds,
  };
}

export async function runWorkshopForCard(
  input: RunWorkshopForCardInput,
): Promise<RunWorkshopForCardResult | null> {
  const card = await getCard(input.cardId);
  if (!card) return null;

  const suggestions = suggestWorkshopsForCard(card, 5);
  const templateId =
    input.templateId ?? suggestions[0]?.templateId ?? listWorkshopTemplates()[0]?.id;
  if (!templateId) return null;

  const board = await startWorkshopFromCard({
    cardId: input.cardId,
    templateId,
    title: input.title,
    actor: input.actor,
  });
  if (!board) return null;

  if (input.zones && Object.keys(input.zones).length > 0) {
    await populateWorkshopZones({
      boardId: board.id,
      zones: input.zones,
      actor: input.actor,
      replacePlaceholders: input.replacePlaceholders ?? true,
    });
  }

  if (input.wireframeComponents?.length) {
    await populateWorkshopWireframe({
      boardId: board.id,
      zoneId: input.wireframeZoneId,
      components: input.wireframeComponents,
      actor: input.actor,
      replaceExisting: true,
    });
  }

  let recorded = null;
  if (input.record !== false) {
    recorded = await recordWorkshopOutcomes({
      boardId: board.id,
      cardId: input.cardId,
      actor: input.actor,
      updateDescription: input.updateDescription,
      appendTags: input.appendTags,
      createFollowUpCards: input.createFollowUpCards,
      emitWebhook: input.emitWebhook,
    });
  }

  const finalBoard = (await getVisualBoard(board.id)) ?? board;
  return {
    board: finalBoard,
    templateId,
    suggestion: suggestions.find((s) => s.templateId === templateId),
    recorded,
  };
}

export async function listWorkshopsForCard(cardId: string): Promise<VisualBoard[]> {
  return listVisualBoards({ linkedCardId: cardId }).then((boards) =>
    boards.filter((b) => b.workshopTemplateId),
  );
}

export { listWorkshopTemplates, getWorkshopTemplate };
