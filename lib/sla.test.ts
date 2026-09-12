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
  // When a card is breached and not resolved, remainingMs should be 0 because Math.max(0, dueMs - now)
  assert.equal(status.remainingMs, 0);
  assert.equal(status.resolved, false);
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
  const status = computeSlaStatus(card);
  assert.equal(status.breached, false);
  // When resolved is true, remainingMs is statically 0 according to `resolved ? 0 : ...`
  assert.equal(status.remainingMs, 0);
  assert.equal(status.resolved, true);
});

test("computeSlaStatus: no slaDueAt", () => {
  const card = migrateCard({
    id: "3",
    title: "Normal task",
    cardType: "task",
    columnId: "backlog",
  });
  // Force delete slaDueAt to test fallback since migrateCard might populate it
  delete card.slaDueAt;
  const status = computeSlaStatus(card);
  assert.equal(status.breached, false);
  assert.equal(status.resolved, false);
  assert.equal(status.remainingMs, undefined);
});

test("computeSlaStatus: within SLA", () => {
  const future = new Date(Date.now() + 3600_000).toISOString();
  const card = migrateCard({
    id: "4",
    title: "Incident",
    cardType: "incident",
    slaDueAt: future,
    columnId: "in_progress",
  });
  const status = computeSlaStatus(card);
  assert.equal(status.breached, false);
  assert.ok((status.remainingMs ?? 0) > 0);
  assert.equal(status.resolved, false);
});

test("formatSlaRemaining", () => {
  assert.equal(formatSlaRemaining(0), "breached");
  assert.match(formatSlaRemaining(3600_000), /1h/);
});

test("SLA warning in final threshold of window", () => {
  const createdAt = new Date(Date.now() - 3.6e6).toISOString();
  const dueAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const card = migrateCard({
    id: "5",
    title: "Almost due",
    cardType: "incident",
    createdAt,
    slaDueAt: dueAt,
    columnId: "in_progress",
  });
  assert.equal(isSlaWarning(card), true);
  assert.equal(computeSlaStatus(card).breached, false);
});
