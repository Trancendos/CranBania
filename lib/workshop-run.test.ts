import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createCard } from "./board";
import { runWorkshopForCard } from "./workshop";
import { getWorkshopTemplate } from "./workshop-templates";

const originalCwd = process.cwd();

test("run workshop creates roadmap board with populated zones", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-run-"));
  process.chdir(tmp);

  try {
    const card = await createCard({
      title: "2026 product roadmap",
      description: "Plan now next later horizons",
      cardType: "feature",
    });

    const result = await runWorkshopForCard({
      cardId: card.id,
      templateId: "product-roadmap",
      zones: {
        now: ["Ship visual boards"],
        next: ["Workshop templates"],
        later: ["Realtime cursors"],
      },
      createFollowUpCards: false,
      actor: "test-agent",
    });

    assert.ok(result);
    assert.equal(result!.templateId, "product-roadmap");
    assert.equal(result!.board.boardType, "roadmap");
    assert.ok(result!.recorded?.summary.zones.some((z) => z.zoneId === "now"));
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("mobile wireframe template includes wire components", () => {
  const t = getWorkshopTemplate("wireframe-mobile");
  assert.ok(t);
  assert.equal(t!.layout, "wireframe-mobile");
  assert.equal(t!.wireframeZoneId, "screen");
});
