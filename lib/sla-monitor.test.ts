import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createCard, readBoard } from "./board";
import { runSlaBreachChecks } from "./sla-monitor";
import { createSprint } from "./workspace";

const originalCwd = process.cwd();

test("auto-assigns active sprint on new card", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-sprint-"));
  process.chdir(tmp);
  try {
    await createSprint({
      name: "Active Sprint",
      startDate: "2026-06-01",
      endDate: "2026-06-14",
      activate: true,
    });

    const card = await createCard({
      title: "Auto sprint card",
      description: "",
      tags: [],
      cardType: "task",
    });

    assert.ok(card.sprintId);
    const board = await readBoard();
    const stored = board.cards.find((c) => c.id === card.id);
    assert.ok(stored?.sprintId);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("SLA breach fires once and sets slaBreachNotifiedAt", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-sla-"));
  process.chdir(tmp);
  try {
    const pastDue = new Date(Date.now() - 3600_000).toISOString();
    const card = await createCard({
      title: "Breached incident",
      description: "",
      tags: [],
      cardType: "incident",
      slaDueAt: pastDue,
    });

    assert.ok(card.slaBreachNotifiedAt, "createCard should trigger SLA breach check");
    assert.ok(card.journal.some((j) => j.type === "sla"));

    const second = await runSlaBreachChecks();
    assert.equal(second, 0, "breach webhooks fire only once per card");
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
