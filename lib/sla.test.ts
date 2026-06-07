import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSlaStatus, formatSlaRemaining, isSlaWarning } from "./sla";
import { migrateCard } from "./types";

test("SLA breach detection", () => {
  const past = new Date(Date.now() - 3600_000).toISOString();
  const card = migrateCard({
    id: "1",
    title: "Outage",
    cardType: "incident",
    slaDueAt: past,
    columnId: "in_progress",
  });
  const status = computeSlaStatus(card);
  assert.equal(status.breached, true);
});

test("SLA stops when done", () => {
  const past = new Date(Date.now() - 3600_000).toISOString();
  const card = migrateCard({
    id: "2",
    title: "Fixed",
    cardType: "incident",
    slaDueAt: past,
    columnId: "done",
    resolvedAt: new Date().toISOString(),
  });
  assert.equal(computeSlaStatus(card).breached, false);
});

test("formatSlaRemaining", () => {
  assert.equal(formatSlaRemaining(0), "breached");
  assert.match(formatSlaRemaining(3600_000), /1h/);
});

test("SLA warning in final threshold of window", () => {
  const createdAt = new Date(Date.now() - 3.6e6).toISOString();
  const dueAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const card = migrateCard({
    id: "3",
    title: "Almost due",
    cardType: "incident",
    createdAt,
    slaDueAt: dueAt,
    columnId: "in_progress",
  });
  assert.equal(isSlaWarning(card), true);
  assert.equal(computeSlaStatus(card).breached, false);
});
