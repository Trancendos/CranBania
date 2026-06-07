import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateBoard, BOARD_DATA_VERSION, stampBoard } from "./migrations";

test("migrateBoard stamps version on write", () => {
  const board = migrateBoard({
    version: 1,
    cards: [{ id: "x", title: "T" }],
  });
  assert.equal(board.cards.length, 1);
  const stored = stampBoard(board);
  assert.equal(stored.version, BOARD_DATA_VERSION);
});
