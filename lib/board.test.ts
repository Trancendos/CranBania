import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  addCodeChange,
  addComment,
  createCard,
  moveCard,
  listCards,
  listBacklog,
  deleteCard,
  getBoardSummary,
  getCardJournal,
} from "./board";

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
    assert.equal(card.journal.length, 1);
    assert.equal(card.journal[0].type, "created");

    const moved = await moveCard(card.id, "planning", undefined, {
      skipSideEffects: true,
    });
    assert.ok(moved);
    assert.equal(moved!.columnId, "planning");

    const inProgress = await moveCard(card.id, "in_progress", undefined, {
      skipSideEffects: true,
    });
    assert.equal(inProgress!.journal.some((j) => j.type === "moved"), true);

    assert.equal((await listCards("in_progress")).length, 1);

    const summary = await getBoardSummary();
    assert.equal(summary.totalCards, 1);
    assert.equal(summary.backlogCount, 0);

    assert.equal(await deleteCard(card.id), true);
    assert.equal((await listCards()).length, 0);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("journal, comments, and code changes", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-"));
  process.chdir(tmp);

  try {
    const card = await createCard({ title: "API endpoint" });
    assert.equal((await listBacklog()).length, 1);

    const withComment = await addComment(card.id, "Start with OpenAPI spec", "claude");
    assert.ok(withComment);
    assert.equal(
      withComment!.journal.filter((j) => j.type === "comment").length,
      1,
    );

    const withCode = await addCodeChange(card.id, {
      filePath: "src/auth.ts",
      changeType: "added",
      content: "export function login() {}",
      actor: "claude",
    });
    assert.ok(withCode);
    assert.equal(withCode!.codeChanges.length, 1);
    assert.equal(
      withCode!.journal.some((j) => j.type === "code_change"),
      true,
    );

    const journal = await getCardJournal(card.id);
    assert.ok(journal);
    assert.ok(journal!.length >= 3);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
