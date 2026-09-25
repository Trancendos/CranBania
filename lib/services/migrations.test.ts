import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateBoard, BOARD_DATA_VERSION, stampBoard } from "./migrations";

test("migrateBoard stamps version on write", () => {
  // A v1 board on disk really does hold cards with two fields; padding this
  // literal out into a full Card would test a shape migrateBoard never meets.
  const legacy = { version: 1, cards: [{ id: "x", title: "T" }] } as unknown;
  const board = migrateBoard(legacy as Parameters<typeof migrateBoard>[0]);
  assert.equal(board.cards.length, 1);
  const stored = stampBoard(board);
  assert.equal(stored.version, BOARD_DATA_VERSION);
});
