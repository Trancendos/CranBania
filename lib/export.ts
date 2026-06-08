import { readBoard, writeBoard } from "./board";
import { readVisualBoards, writeAllVisualBoards } from "./visual-board";
import { readWebhooks, writeWebhooks } from "./webhooks";
import { readWorkspace, writeWorkspace } from "./workspace";
import type { WorkspaceExport } from "./types";

export async function exportWorkspace(): Promise<WorkspaceExport> {
  const board = await readBoard();
  const workspace = await readWorkspace();
  const visualBoards = await readVisualBoards();
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    board,
    workspace,
    visualBoards,
    zeroCost: true,
  };
}

export async function importWorkspace(
  data: WorkspaceExport,
  mode: "merge" | "replace" = "merge",
): Promise<{ cards: number; epics: number; sprints: number; visualBoards: number }> {
  if (data.version !== 2 && data.version !== 3) {
    throw new Error("Unsupported export version");
  }

  if (mode === "replace") {
    await writeBoard(data.board);
    await writeWorkspace(data.workspace);
    if (data.visualBoards) {
      await writeAllVisualBoards(data.visualBoards);
    }
    return {
      cards: data.board.cards.length,
      epics: data.workspace.epics.length,
      sprints: data.workspace.sprints.length,
      visualBoards: data.visualBoards?.length ?? 0,
    };
  }

  const board = await readBoard();
  const ws = await readWorkspace();
  const existingIds = new Set(board.cards.map((c) => c.id));
  const newCards = data.board.cards.filter((c) => !existingIds.has(c.id));
  board.cards.push(...newCards);
  await writeBoard(board);

  const epicIds = new Set(ws.epics.map((e) => e.id));
  ws.epics.push(...data.workspace.epics.filter((e) => !epicIds.has(e.id)));
  const sprintIds = new Set(ws.sprints.map((s) => s.id));
  ws.sprints.push(...data.workspace.sprints.filter((s) => !sprintIds.has(s.id)));
  await writeWorkspace(ws);

  let visualCount = 0;
  if (data.visualBoards?.length) {
    const existing = await readVisualBoards();
    const ids = new Set(existing.map((b) => b.id));
    const merged = [...existing, ...data.visualBoards.filter((b) => !ids.has(b.id))];
    visualCount = merged.length - existing.length;
    await writeAllVisualBoards(merged);
  }

  return {
    cards: newCards.length,
    epics: data.workspace.epics.length,
    sprints: data.workspace.sprints.length,
    visualBoards: visualCount,
  };
}

export async function exportWebhooksBackup() {
  const webhooks = (await readWebhooks()).filter((w) => !w.id.startsWith("env-"));
  return { webhooks, exportedAt: new Date().toISOString() };
}

export async function restoreWebhooks(webhooks: Awaited<ReturnType<typeof readWebhooks>>) {
  await writeWebhooks(webhooks.filter((w) => !w.id.startsWith("env-")));
}
