import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import {
  addVisualEdge,
  addVisualNode,
  createVisualBoard,
  deleteVisualBoard,
  deleteVisualNode,
  getVisualBoard,
  listVisualBoards,
  replaceVisualCanvas,
  updateVisualBoard,
  updateVisualNode,
} from "./visual-board";

const originalCwd = process.cwd();

test("visual board CRUD and templates", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-visual-"));
  process.chdir(tmp);

  try {
    const flow = await createVisualBoard({
      title: "Auth flow",
      boardType: "flowchart",
    });
    assert.equal(flow.boardType, "flowchart");
    assert.ok(flow.nodes.length >= 4);
    assert.ok(flow.edges.length >= 1);

    const retro = await createVisualBoard({
      title: "Sprint retro",
      boardType: "retro",
    });
    assert.equal(retro.nodes.filter((n) => n.kind === "frame").length, 3);

    const listed = await listVisualBoards({ boardType: "flowchart" });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, flow.id);

    const fetched = await getVisualBoard(flow.id);
    assert.ok(fetched);
    assert.equal(fetched!.title, "Auth flow");

    const updated = await updateVisualBoard(flow.id, {
      title: "Auth flow v2",
      viewport: { x: 10, y: 20, zoom: 1.5 },
    });
    assert.ok(updated);
    assert.equal(updated!.title, "Auth flow v2");
    assert.equal(updated!.viewport.zoom, 1.5);

    assert.equal(await deleteVisualBoard(flow.id), true);
    assert.equal(await getVisualBoard(flow.id), null);
    assert.equal((await listVisualBoards()).length, 1);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("visual nodes, edges, and canvas replace", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-visual-"));
  process.chdir(tmp);

  try {
    const board = await createVisualBoard({ title: "Canvas", boardType: "whiteboard" });
    const startCount = board.nodes.length;

    const withNode = await addVisualNode(board.id, {
      kind: "sticky",
      x: 200,
      y: 200,
      text: "Agent note",
    });
    assert.ok(withNode);
    assert.equal(withNode!.nodes.length, startCount + 1);
    const sticky = withNode!.nodes[withNode!.nodes.length - 1];

    const moved = await updateVisualNode(board.id, sticky.id, { x: 240, y: 260 });
    assert.ok(moved);
    const movedNode = moved!.nodes.find((n) => n.id === sticky.id);
    assert.equal(movedNode!.x, 240);

    const rect = await addVisualNode(board.id, {
      kind: "rectangle",
      x: 400,
      y: 200,
      text: "Step 2",
    });
    assert.ok(rect);
    const rectNode = rect!.nodes.find((n) => n.text === "Step 2");
    assert.ok(rectNode);

    const linked = await addVisualEdge(board.id, {
      fromNodeId: sticky.id,
      toNodeId: rectNode!.id,
      label: "next",
    });
    assert.ok(linked);
    assert.equal(linked!.edges.some((e) => e.label === "next"), true);

    const afterDelete = await deleteVisualNode(board.id, sticky.id);
    assert.ok(afterDelete);
    assert.equal(afterDelete!.nodes.some((n) => n.id === sticky.id), false);
    assert.equal(afterDelete!.edges.length, 0);

    const n1 = randomUUID();
    const n2 = randomUUID();
    const replaced = await replaceVisualCanvas(board.id, [
      {
        id: n1,
        kind: "ellipse",
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        text: "Start",
      },
      {
        id: n2,
        kind: "rectangle",
        x: 150,
        y: 0,
        width: 100,
        height: 50,
        text: "End",
      },
    ], [
      {
        id: randomUUID(),
        fromNodeId: n1,
        toNodeId: n2,
      },
    ]);
    assert.ok(replaced);
    assert.equal(replaced!.nodes.length, 2);
    assert.equal(replaced!.edges.length, 1);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
