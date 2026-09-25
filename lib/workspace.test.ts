import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createSprint, createEpic, getSprintBurndown, readWorkspace } from "./workspace";
import type { Card } from "./types";

const originalCwd = process.cwd();

// getSprintBurndown takes Card[], and an object literal with three of its
// twenty fields is not one. The partial literals #23 passed run fine under tsx
// (which strips types without checking them) and fail `tsc --noEmit`, so the
// test passed while the repository stopped typechecking.
let seq = 0;
function card(overrides: Partial<Card>): Card {
  seq += 1;
  const now = new Date().toISOString();
  return {
    id: `card-${seq}`,
    title: `Card ${seq}`,
    description: "",
    columnId: "backlog",
    order: seq,
    tags: [],
    cardType: "task",
    priority: "medium",
    journal: [],
    codeChanges: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("epic and sprint workspace", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-ws-"));
  process.chdir(tmp);
  try {
    const epic = await createEpic("Auth overhaul", "Login + SSO");
    assert.ok(epic.id);

    const sprint = await createSprint({
      name: "Sprint 1",
      startDate: "2026-06-01",
      endDate: "2026-06-14",
      activate: true,
    });
    assert.equal(sprint.status, "active");

    const burndown = await getSprintBurndown(sprint.id, [
      card({ sprintId: sprint.id, columnId: "done", storyPoints: 3 }),
      card({ sprintId: sprint.id, columnId: "in_progress", storyPoints: 5 }),
    ]);
    assert.ok(burndown);
    assert.equal(burndown!.totalPoints, 8);
    assert.equal(burndown!.donePoints, 3);
    assert.ok(Array.isArray(burndown!.series));
    assert.ok(burndown!.series.length > 0);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});


test("createEpic standalone", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-ws-epic-"));
  process.chdir(tmp);
  try {
    const title = "New API";
    const desc = "Implement new API endpoints";
    const epic = await createEpic(title, desc);

    assert.ok(epic.id, "Should generate an id");
    assert.equal(epic.title, title, "Should set title");
    assert.equal(epic.description, desc, "Should set description");
    assert.equal(epic.status, "open", "Default status should be open");
    assert.ok(epic.createdAt, "Should set createdAt");

    const ws = await readWorkspace();
    assert.equal(ws.epics.length, 1);
    assert.deepEqual(ws.epics[0], epic);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
