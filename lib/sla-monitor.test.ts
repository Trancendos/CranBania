import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createCard, readBoard, writeBoard } from "./board";
import { runSlaBreachChecks, runSlaChecks } from "./sla-monitor";
import { createSprint } from "./workspace";
import { migrateCard } from "./types";
import { randomUUID } from "crypto";

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

test("SLA warning fires once in final window", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-sla-warn-"));
  process.chdir(tmp);
  try {
    const createdAt = new Date(Date.now() - 3.6e6).toISOString();
    const dueSoon = new Date(Date.now() + 10 * 60_000).toISOString();
    const board = await readBoard();
    board.cards.push(
      migrateCard({
        id: randomUUID(),
        title: "Warning incident",
        cardType: "incident",
        createdAt,
        slaDueAt: dueSoon,
        columnId: "in_progress",
      }),
    );
    await writeBoard(board);

    const first = await runSlaChecks();
    assert.equal(first.warnings, 1);
    assert.equal(first.breaches, 0);

    const updated = await readBoard();
    const stored = updated.cards[0];
    assert.ok(stored.slaWarningNotifiedAt);
    assert.ok(stored.journal.some((j) => j.message.includes("SLA warning")));

    const second = await runSlaChecks();
    assert.equal(second.warnings, 0);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
