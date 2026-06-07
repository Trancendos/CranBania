import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createSprint, createEpic, getSprintBurndown } from "./workspace";

const originalCwd = process.cwd();

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
      { sprintId: sprint.id, columnId: "done", storyPoints: 3 },
      { sprintId: sprint.id, columnId: "in_progress", storyPoints: 5 },
    ]);
    assert.ok(burndown);
    assert.equal(burndown!.totalPoints, 8);
    assert.equal(burndown!.donePoints, 3);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
