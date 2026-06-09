import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  exportVisualBoardSnapshot,
  mergeCanvasImport,
  parseVisualBoardImport,
} from "./visual-canvas-io";
import type { VisualBoard } from "./visual-types";

const sampleBoard = (): VisualBoard => ({
  id: "b1",
  title: "Test",
  description: "",
  boardType: "whiteboard",
  nodes: [{ id: "n1", kind: "sticky", x: 0, y: 0, width: 100, height: 80, text: "Hi" }],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("visual-canvas-io", () => {
  it("exports and parses cranbania-visual-board v1", () => {
    const snap = exportVisualBoardSnapshot(sampleBoard());
    const parsed = parseVisualBoardImport(snap);
    assert.equal(parsed.format, "cranbania-visual-board");
    assert.equal(parsed.board.nodes.length, 1);
  });

  it("merges imported nodes with offset", () => {
    const snap = exportVisualBoardSnapshot(sampleBoard());
    const merged = mergeCanvasImport([], [], snap, "merge");
    assert.equal(merged.nodes.length, 1);
    assert.equal(merged.nodes[0].x, 40);
  });
});
