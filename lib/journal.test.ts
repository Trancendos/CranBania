import { test } from "node:test";
import assert from "node:assert/strict";
import { createJournalEntry, journalComments } from "./journal";
import type { JournalEntry } from "./types";

test("createJournalEntry creates entry with default actor", () => {
  const entry = createJournalEntry("created", "Card created");

  assert.ok(entry.id, "Should have an ID");
  assert.equal(entry.type, "created");
  assert.equal(entry.message, "Card created");
  assert.equal(entry.actor, "system");
  assert.ok(entry.at, "Should have a timestamp");

  // Verify UUID format (basic check)
  assert.match(entry.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  // Verify ISO date format
  assert.match(entry.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("createJournalEntry uses provided actor and meta", () => {
  const meta = { foo: "bar" };
  const entry = createJournalEntry("comment", "Hello world", "alice", meta);

  assert.equal(entry.type, "comment");
  assert.equal(entry.message, "Hello world");
  assert.equal(entry.actor, "alice");
  assert.deepEqual(entry.meta, meta);
});

test("journalComments filters out non-comment entries", () => {
  const entries: JournalEntry[] = [
    createJournalEntry("created", "Created"),
    createJournalEntry("comment", "First comment"),
    createJournalEntry("moved", "Moved to In Progress"),
    createJournalEntry("comment", "Second comment"),
  ];

  const comments = journalComments(entries);

  assert.equal(comments.length, 2);
  assert.equal(comments[0].message, "First comment");
  assert.equal(comments[1].message, "Second comment");
});

test("journalComments returns empty array if no comments", () => {
  const entries: JournalEntry[] = [
    createJournalEntry("created", "Created"),
    createJournalEntry("moved", "Moved to In Progress"),
  ];

  const comments = journalComments(entries);

  assert.equal(comments.length, 0);
});
