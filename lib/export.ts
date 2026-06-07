import { readBoard, writeBoard } from "./board";
import { readWebhooks, writeWebhooks } from "./webhooks";
import { readWorkspace, writeWorkspace } from "./workspace";
import type { WorkspaceExport } from "./types";

export async function exportWorkspace(): Promise<WorkspaceExport> {
  const board = await readBoard();
  const workspace = await readWorkspace();
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    board,
    workspace,
    zeroCost: true,
  };
}

export async function importWorkspace(
  data: WorkspaceExport,
  mode: "merge" | "replace" = "merge",
): Promise<{ cards: number; epics: number; sprints: number }> {
  if (data.version !== 2) {
    throw new Error("Unsupported export version");
  }

  if (mode === "replace") {
    await writeBoard(data.board);
    await writeWorkspace(data.workspace);
    return {
      cards: data.board.cards.length,
      epics: data.workspace.epics.length,
      sprints: data.workspace.sprints.length,
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

  return {
    cards: newCards.length,
    epics: data.workspace.epics.length,
    sprints: data.workspace.sprints.length,
  };
}

export async function exportWebhooksBackup() {
  const webhooks = (await readWebhooks()).filter((w) => !w.id.startsWith("env-"));
  return { webhooks, exportedAt: new Date().toISOString() };
}

export async function restoreWebhooks(webhooks: Awaited<ReturnType<typeof readWebhooks>>) {
  await writeWebhooks(webhooks.filter((w) => !w.id.startsWith("env-")));
}
