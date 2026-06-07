import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Card, Epic, Sprint, SprintStatus, WorkspaceData } from "./types";

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

export interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
  completed: number;
}

export interface SprintBurndown {
  sprintId: string;
  sprintName: string;
  startDate: string;
  endDate: string;
  totalCards: number;
  doneCards: number;
  remainingCards: number;
  totalPoints: number;
  donePoints: number;
  remainingPoints: number;
  byColumn: Record<string, number>;
  series: BurndownPoint[];
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const cap = last < today ? last : today;

  while (cur <= cap) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  if (dates.length === 0) dates.push(start);
  return dates;
}

export async function getSprintBurndown(
  sprintId: string,
  cards: Card[],
): Promise<SprintBurndown | null> {
  const sprint = (await readWorkspace()).sprints.find((s) => s.id === sprintId);
  if (!sprint) return null;

  const inSprint = cards.filter((c) => c.sprintId === sprintId);
  const done = inSprint.filter((c) => c.columnId === "done");
  const byColumn: Record<string, number> = {};
  for (const c of inSprint) {
    byColumn[c.columnId] = (byColumn[c.columnId] ?? 0) + 1;
  }

  const points = (c: Card) => c.storyPoints ?? 1;
  const totalPoints = inSprint.reduce((s, c) => s + points(c), 0);
  const donePoints = done.reduce((s, c) => s + points(c), 0);

  const days = dateRange(sprint.startDate, sprint.endDate);
  const dayCount = Math.max(
    1,
    Math.ceil(
      (new Date(`${sprint.endDate}T00:00:00.000Z`).getTime() -
        new Date(`${sprint.startDate}T00:00:00.000Z`).getTime()) /
        86400_000,
    ) + 1,
  );

  const series: BurndownPoint[] = days.map((date, idx) => {
    const endOfDay = new Date(`${date}T23:59:59.999Z`).getTime();
    const completed = inSprint
      .filter((c) => {
        if (c.columnId !== "done") return false;
        const resolved = c.resolvedAt
          ? new Date(c.resolvedAt).getTime()
          : new Date(c.updatedAt).getTime();
        return resolved <= endOfDay;
      })
      .reduce((s, c) => s + points(c), 0);

    const remaining = Math.max(0, totalPoints - completed);
    const ideal = Math.max(
      0,
      totalPoints - (totalPoints * (idx + 1)) / dayCount,
    );

    return { date, remaining, ideal: Math.round(ideal * 10) / 10, completed };
  });

  return {
    sprintId,
    sprintName: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    totalCards: inSprint.length,
    doneCards: done.length,
    remainingCards: inSprint.length - done.length,
    totalPoints,
    donePoints,
    remainingPoints: totalPoints - donePoints,
    byColumn,
    series,
  };
}
