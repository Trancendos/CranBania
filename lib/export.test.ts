import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

import { exportWorkspace, importWorkspace, exportWebhooksBackup, restoreWebhooks } from "./export";
import { createCard, readBoard } from "./board";
import { createEpic, readWorkspace } from "./workspace";
import { createVisualBoard, readVisualBoards } from "./visual-board";
import { writeWebhooks, readWebhooks } from "./webhooks";
import type { WorkspaceExport } from "./types";

const originalCwd = process.cwd();

test("exportWorkspace and importWorkspace", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-export-"));
  process.chdir(tmp);

  try {
    // 1. Setup initial data
    const card1 = await createCard({ title: "Card 1" });
    const epic1 = await createEpic("Epic 1");
    const vb1 = await createVisualBoard({ title: "Board 1" });

    // 2. Test exportWorkspace
    const exported = await exportWorkspace();
    assert.equal(exported.version, 3);
    assert.equal(exported.zeroCost, true);
    assert.ok(exported.exportedAt);
    assert.equal(exported.board.cards.length, 1);
    assert.equal(exported.board.cards[0].id, card1.id);
    assert.equal(exported.workspace.epics.length, 1);
    assert.equal(exported.workspace.epics[0].id, epic1.id);
    assert.equal(exported.visualBoards?.length, 1);
    assert.equal(exported.visualBoards?.[0].id, vb1.id);

    // Create a modified export object for import tests
    const newCard = { ...card1, id: "new-card-1", title: "New Card" };
    const newEpic = { ...epic1, id: "new-epic-1", title: "New Epic" };
    const newVb = { ...vb1, id: "new-vb-1", title: "New VB" };

    const mergeExport: WorkspaceExport = {
      ...exported,
      board: { ...exported.board, cards: [card1, newCard] },
      workspace: { ...exported.workspace, epics: [epic1, newEpic] },
      visualBoards: [vb1, newVb],
    };

    // 3. Test importWorkspace - Merge Mode
    const mergeResult = await importWorkspace(mergeExport, "merge");
    assert.equal(mergeResult.cards, 1, "Should add 1 new card");
    assert.equal(mergeResult.epics, 2, "Should have 2 epics total from incoming data length");
    assert.equal(mergeResult.visualBoards, 1, "Should add 1 new visual board");

    const mergedBoard = await readBoard();
    const mergedWorkspace = await readWorkspace();
    const mergedVisualBoards = await readVisualBoards();

    assert.equal(mergedBoard.cards.length, 2);
    assert.equal(mergedWorkspace.epics.length, 2);
    assert.equal(mergedVisualBoards.length, 2);

    // 4. Test importWorkspace - Replace Mode
    const replaceExport: WorkspaceExport = {
      version: 3,
      exportedAt: new Date().toISOString(),
      board: { ...exported.board, cards: [newCard] },
      workspace: { ...exported.workspace, epics: [newEpic] },
      visualBoards: [newVb],
      zeroCost: true,
    };

    const replaceResult = await importWorkspace(replaceExport, "replace");
    assert.equal(replaceResult.cards, 1);
    assert.equal(replaceResult.epics, 1);
    assert.equal(replaceResult.visualBoards, 1);

    const replacedBoard = await readBoard();
    const replacedWorkspace = await readWorkspace();
    const replacedVisualBoards = await readVisualBoards();

    assert.equal(replacedBoard.cards.length, 1);
    assert.equal(replacedBoard.cards[0].id, newCard.id);
    assert.equal(replacedWorkspace.epics.length, 1);
    assert.equal(replacedWorkspace.epics[0].id, newEpic.id);
    assert.equal(replacedVisualBoards.length, 1);
    assert.equal(replacedVisualBoards[0].id, newVb.id);

    // 5. Test importWorkspace - Error Mode
    await assert.rejects(
      importWorkspace({ ...exported, version: 1 as any }, "merge"),
      /Unsupported export version/
    );

  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("exportWebhooksBackup and restoreWebhooks", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-webhooks-"));
  process.chdir(tmp);

  try {
    const webhooks = [
      { id: "env-1", url: "http://env", enabled: true, events: [] },
      { id: "custom-1", url: "http://custom", enabled: true, events: [] }
    ] as any[];

    await writeWebhooks(webhooks);

    // test export
    const exported = await exportWebhooksBackup();
    assert.equal(exported.webhooks.length, 1);
    assert.equal(exported.webhooks[0].id, "custom-1");

    // test restore
    await writeWebhooks([]); // clear
    await restoreWebhooks([
      { id: "env-2", url: "http://env2", enabled: true, events: [] },
      { id: "custom-2", url: "http://custom2", enabled: true, events: [] }
    ] as any[]);

    const restored = await readWebhooks();
    assert.equal(restored.length, 1);
    assert.equal(restored[0].id, "custom-2");

  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
