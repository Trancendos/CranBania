import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  addComments,
  createCard,
  createCards,
  getCard,
  getPrince2Overview,
  listCards,
  readBoard,
} from "./board";
import type { CreateCardInput } from "./board";

// The bulk paths (#22, #31) and the counting rewrite (#21) replace N board
// reads and writes with one. Nothing covered them, so what follows checks the
// properties that collapsing actually puts at risk: accumulation across inputs
// naming one card, returned state matching what was written, and the per-card
// fields the loop used to derive one at a time.
const originalCwd = process.cwd();

async function inTmp<T>(fn: () => Promise<T>): Promise<T> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-bulk-"));
  process.chdir(tmp);
  try {
    return await fn();
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

test("addComments accumulates every comment on one card", async () => {
  await inTmp(async () => {
    const card = await createCard({ title: "Target" });

    const results = await addComments([
      { id: card.id, message: "first", actor: "agent" },
      { id: card.id, message: "second", actor: "agent" },
      { id: card.id, message: "third", actor: "agent" },
    ]);

    const stored = await getCard(card.id);
    const comments = stored!.journal.filter((e) => e.type === "comment");
    assert.equal(comments.length, 3);
    assert.deepEqual(
      comments.map((c) => c.message),
      ["first", "second", "third"],
    );

    // Every returned entry is the card as written, not a mid-loop snapshot.
    for (const returned of results) {
      assert.equal(
        returned!.journal.filter((e) => e.type === "comment").length,
        3,
      );
    }
  });
});

test("addComments reports a missing card as null without dropping the rest", async () => {
  await inTmp(async () => {
    const card = await createCard({ title: "Target" });

    const results = await addComments([
      { id: "no-such-card", message: "lost" },
      { id: card.id, message: "kept" },
    ]);

    assert.equal(results[0], null);
    assert.equal(results[1]!.id, card.id);
    const stored = await getCard(card.id);
    assert.equal(stored!.journal.filter((e) => e.type === "comment").length, 1);
  });
});

test("createCards gives each card its own order and id", async () => {
  await inTmp(async () => {
    const inputs: CreateCardInput[] = [
      { title: "One", columnId: "backlog" },
      { title: "Two", columnId: "backlog" },
      { title: "Three", columnId: "backlog" },
    ];
    const created = await createCards(inputs);

    assert.equal(created.length, 3);
    assert.equal(new Set(created.map((c) => c.id)).size, 3);
    // nextOrder is computed against the board as it grows, so the three orders
    // are distinct rather than all taking the pre-batch value.
    assert.equal(new Set(created.map((c) => c.order)).size, 3);

    const onBoard = await listCards("backlog");
    assert.equal(onBoard.length, 3);
    assert.deepEqual(
      created.map((c) => c.title).sort(),
      ["One", "Three", "Two"],
    );
  });
});

test("createCards refuses an invalid column, as createCard does", async () => {
  await inTmp(async () => {
    await assert.rejects(
      createCards([{ title: "Bad", columnId: "nowhere" as never }]),
      /Invalid columnId: nowhere/,
    );
    const board = await readBoard();
    assert.equal(board.cards.length, 0);
  });
});

test("getPrince2Overview counts every stage in one pass", async () => {
  await inTmp(async () => {
    await createCards([
      { title: "a", prince2Stage: "initiation" },
      { title: "b", prince2Stage: "initiation" },
      { title: "c", prince2Stage: "delivery" },
      { title: "d" },
    ]);

    // "d" names no stage, and migrateCard defaults it to starting_up -- so the
    // count is 1, not 0. Written the other way first, and corrected against
    // what the code does rather than the code corrected against the test.
    const counts = await getPrince2Overview();
    assert.deepEqual(counts, {
      starting_up: 1,
      initiation: 2,
      delivery: 1,
      stage_boundary: 0,
      closing: 0,
    });
  });
});
