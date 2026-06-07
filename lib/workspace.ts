import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Epic, Sprint, SprintStatus, WorkspaceData } from "./types";

function workspacePath() {
  return path.join(process.cwd(), "data", "workspace.json");
}

function dataDir() {
  return path.join(process.cwd(), "data");
}

async function ensureDataDir() {
  await fs.mkdir(dataDir(), { recursive: true });
}

export async function readWorkspace(): Promise<WorkspaceData> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(workspacePath(), "utf-8");
    return JSON.parse(raw) as WorkspaceData;
  } catch {
    const empty: WorkspaceData = { epics: [], sprints: [] };
    await writeWorkspace(empty);
    return empty;
  }
}

export async function writeWorkspace(data: WorkspaceData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(workspacePath(), JSON.stringify(data, null, 2), "utf-8");
}

export async function listEpics() {
  return (await readWorkspace()).epics;
}

export async function getEpic(id: string) {
  return (await readWorkspace()).epics.find((e) => e.id === id) ?? null;
}

export async function createEpic(title: string, description = ""): Promise<Epic> {
  const ws = await readWorkspace();
  const epic: Epic = {
    id: randomUUID(),
    title,
    description,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  ws.epics.push(epic);
  await writeWorkspace(ws);
  return epic;
}

export async function listSprints(status?: SprintStatus) {
  const sprints = (await readWorkspace()).sprints;
  return status ? sprints.filter((s) => s.status === status) : sprints;
}

export async function getActiveSprint(): Promise<Sprint | null> {
  const active = (await readWorkspace()).sprints.filter((s) => s.status === "active");
  return active[0] ?? null;
}

export async function createSprint(input: {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  activate?: boolean;
}): Promise<Sprint> {
  const ws = await readWorkspace();
  if (input.activate) {
    for (const s of ws.sprints) {
      if (s.status === "active") s.status = "closed";
    }
  }
  const sprint: Sprint = {
    id: randomUUID(),
    name: input.name,
    goal: input.goal ?? "",
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.activate ? "active" : "planning",
    createdAt: new Date().toISOString(),
  };
  ws.sprints.push(sprint);
  await writeWorkspace(ws);
  return sprint;
}

export async function activateSprint(id: string): Promise<Sprint | null> {
  const ws = await readWorkspace();
  const sprint = ws.sprints.find((s) => s.id === id);
  if (!sprint) return null;
  for (const s of ws.sprints) {
    if (s.status === "active") s.status = "closed";
  }
  sprint.status = "active";
  await writeWorkspace(ws);
  return sprint;
}

export interface SprintBurndown {
  sprintId: string;
  sprintName: string;
  totalCards: number;
  doneCards: number;
  remainingCards: number;
  totalPoints: number;
  donePoints: number;
  remainingPoints: number;
  byColumn: Record<string, number>;
}

export async function getSprintBurndown(
  sprintId: string,
  cards: { sprintId?: string; columnId: string; storyPoints?: number }[],
): Promise<SprintBurndown | null> {
  const sprint = (await readWorkspace()).sprints.find((s) => s.id === sprintId);
  if (!sprint) return null;

  const inSprint = cards.filter((c) => c.sprintId === sprintId);
  const done = inSprint.filter((c) => c.columnId === "done");
  const byColumn: Record<string, number> = {};
  for (const c of inSprint) {
    byColumn[c.columnId] = (byColumn[c.columnId] ?? 0) + 1;
  }

  const totalPoints = inSprint.reduce((s, c) => s + (c.storyPoints ?? 1), 0);
  const donePoints = done.reduce((s, c) => s + (c.storyPoints ?? 1), 0);

  return {
    sprintId,
    sprintName: sprint.name,
    totalCards: inSprint.length,
    doneCards: done.length,
    remainingCards: inSprint.length - done.length,
    totalPoints,
    donePoints,
    remainingPoints: totalPoints - donePoints,
    byColumn,
  };
}
