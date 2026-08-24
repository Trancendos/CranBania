import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateBoard, BOARD_DATA_VERSION, stampBoard } from "./migrations";

test("migrateBoard stamps version on write", () => {
  const board = migrateBoard({
    version: 1,
    cards: [{ id: "x", title: "T", description: "", cardType: "task", columnId: "backlog", priority: "medium", order: 0, tags: [], journal: [], codeChanges: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() as string }],
  });
  assert.equal(board.cards.length, 1);
  const stored = stampBoard(board);
  assert.equal(stored.version, BOARD_DATA_VERSION);
});
