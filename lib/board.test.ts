import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  createCard,
  moveCard,
  listCards,
  deleteCard,
  getBoardSummary,
} from "./board";

// Point board module at a temp directory for isolated tests
const originalCwd = process.cwd();

test("board CRUD and move workflow", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-"));
  process.chdir(tmp);

  try {
    const card = await createCard({
      title: "Implement auth",
      description: "Add login flow",
      tags: ["feature"],
    });
    assert.equal(card.columnId, "backlog");

    const moved = await moveCard(card.id, "in_progress");
    assert.ok(moved);
    assert.equal(moved!.columnId, "in_progress");

    const inProgress = await listCards("in_progress");
    assert.equal(inProgress.length, 1);

    const summary = await getBoardSummary();
    assert.equal(summary.totalCards, 1);
    assert.equal(
      summary.columns.find((c) => c.id === "in_progress")?.cardCount,
      1,
    );

    assert.equal(await deleteCard(card.id), true);
    assert.equal((await listCards()).length, 0);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
