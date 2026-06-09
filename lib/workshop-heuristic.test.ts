import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { heuristicZonesFromCard } from "./workshop-heuristic";
import { getWorkshopTemplate } from "./workshop-templates";
import type { Card } from "./types";

const baseCard = (): Card => ({
  id: "c1",
  title: "Fix login timeout",
  description:
    "Users cannot sign in. Root cause: session expiry. Action: extend token TTL. Strength: fast rollback.",
  columnId: "backlog",
  order: 0,
  tags: ["auth"],
  cardType: "bug",
  priority: "high",
  journal: [],
  codeChanges: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("heuristicZonesFromCard", () => {
  it("fills SWOT zones from card text without LLM", () => {
    const template = getWorkshopTemplate("swot");
    assert.ok(template);
    const zones = heuristicZonesFromCard(baseCard(), template);
    const allItems = Object.values(zones).flat();
    assert.ok(allItems.length >= 2);
    assert.ok(allItems.some((t) => /login|session|token|rollback/i.test(t)));
  });

  it("provides placeholder hints for empty zones", () => {
    const template = getWorkshopTemplate("open-brainstorm");
    assert.ok(template);
    const card = { ...baseCard(), description: "" };
    const zones = heuristicZonesFromCard(card, template);
    assert.equal(Object.keys(zones).length, template.zones.length);
  });
});
