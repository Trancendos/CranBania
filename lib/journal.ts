import { randomUUID } from "crypto";
import type { JournalEntry, JournalEntryType } from "./types";

export function createJournalEntry(
  type: JournalEntryType,
  message: string,
  actor?: string,
  meta?: Record<string, unknown>,
): JournalEntry {
  return {
    id: randomUUID(),
    type,
    at: new Date().toISOString(),
    actor: actor ?? "system",
    message,
    meta,
  };
}

export function journalComments(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => e.type === "comment");
}
