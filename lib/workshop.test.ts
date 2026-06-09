import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createCard } from "./board";
import {
  extractWorkshopOutcomes,
  populateWorkshopZones,
  recordWorkshopOutcomes,
  startWorkshopFromCard,
  suggestWorkshopsForCard,
} from "./workshop";
import { getWorkshopTemplate, listWorkshopTemplates } from "./workshop-templates";

const originalCwd = process.cwd();

test("workshop template catalog includes SWOT and 5 Whys", () => {
  const templates = listWorkshopTemplates();
  assert.ok(templates.length >= 15);
  assert.ok(getWorkshopTemplate("swot"));
  assert.ok(getWorkshopTemplate("five-whys"));
  assert.ok(getWorkshopTemplate("good-bad-ugly"));
});

test("suggest workshops for incident card prefers analysis templates", () => {
  const card = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Production outage root cause",
    description: "Need RCA and why analysis for incident",
    cardType: "incident" as const,
    columnId: "backlog" as const,
    priority: "high" as const,
    tags: [],
    journal: [],
    codeChanges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const suggestions = suggestWorkshopsForCard(card, 3);
  assert.ok(suggestions.length > 0);
  const ids = suggestions.map((s) => s.templateId);
  assert.ok(ids.includes("five-whys") || ids.includes("fishbone"));
});

test("start, populate, and record workshop to card", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-workshop-"));
  process.chdir(tmp);

  try {
    const card = await createCard({
      title: "Launch new API",
      description: "Evaluate strategy before build",
      cardType: "feature",
    });

    const board = await startWorkshopFromCard({
      cardId: card.id,
      templateId: "swot",
      actor: "test-agent",
    });
    assert.ok(board);
    assert.equal(board!.workshopTemplateId, "swot");
    assert.ok(board!.workshop?.zones.length === 4);

    const populated = await populateWorkshopZones({
      boardId: board!.id,
      zones: {
        strengths: ["Existing MCP integration", "Zero SaaS mandate"],
        weaknesses: ["No realtime cursors"],
        opportunities: ["Agent-driven workshops"],
        threats: ["Scope creep"],
      },
      actor: "test-agent",
      replacePlaceholders: true,
    });
    assert.ok(populated);

    const preview = extractWorkshopOutcomes(populated!);
    assert.ok(preview);
    assert.equal(preview!.zones.find((z) => z.zoneId === "strengths")?.items.length, 2);

    const recorded = await recordWorkshopOutcomes({
      boardId: board!.id,
      actor: "test-agent",
    });
    assert.ok(recorded);
    assert.equal(recorded!.board.workshop?.status, "completed");
    assert.ok(recorded!.card);
    assert.ok(recorded!.card!.tags?.includes("workshop:swot"));
    assert.ok(
      recorded!.card!.journal.some((j) =>
        j.message.includes("[Workshop · SWOT Analysis · Strengths]"),
      ),
    );
    assert.ok(recorded!.card!.description?.includes("## Workshop: SWOT Analysis"));
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
