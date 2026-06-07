"use client";

import { useState } from "react";
import type { Card, CodeChange, JournalEntry } from "@/lib/types";

function JournalIcon({ type }: { type: JournalEntry["type"] }) {
  const colors: Record<JournalEntry["type"], string> = {
    created: "text-green-400",
    moved: "text-blue-400",
    updated: "text-yellow-400",
    comment: "text-purple-400",
    code_change: "text-orange-400",
    webhook: "text-cyan-400",
    worktree: "text-emerald-400",
  };
  return (
    <span className={`text-[10px] uppercase ${colors[type]}`}>{type}</span>
  );
}

function CodeChangeBlock({ change }: { change: CodeChange }) {
  const colors = {
    added: "border-green-700 bg-green-950/30",
    edited: "border-yellow-700 bg-yellow-950/20",
    deleted: "border-red-700 bg-red-950/30",
  };
  return (
    <div className={`rounded border p-2 text-xs ${colors[change.changeType]}`}>
      <div className="mb-1 flex justify-between gap-2">
        <code className="text-[var(--accent)]">{change.filePath}</code>
        <span className="text-[var(--muted)]">{change.changeType}</span>
      </div>
      {change.previousContent && change.changeType === "edited" ? (
        <pre className="mb-1 max-h-24 overflow-auto text-red-300 line-through opacity-70">
          {change.previousContent}
        </pre>
      ) : null}
      {change.changeType !== "deleted" ? (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-green-200">
          {change.content}
        </pre>
      ) : (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-red-200">
          {change.content || change.previousContent}
        </pre>
      )}
    </div>
  );
}

export default function CardDetailPanel({
  card,
  onClose,
  onUpdated,
}: {
  card: Card;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/cards/${card.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: comment, actor: "human" }),
    });
    setComment("");
    setSubmitting(false);
    await onUpdated();
  }

  const comments = card.journal.filter((j) => j.type === "comment");
  const audit = card.journal.filter((j) => j.type !== "comment");

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-2xl">
      <header className="flex items-start justify-between border-b border-[var(--border)] p-4">
        <div>
          <p className="text-xs text-[var(--muted)]">{card.columnId}</p>
          <h2 className="text-lg font-bold">{card.title}</h2>
          {card.worktree ? (
            <p className="mt-1 text-xs text-emerald-400">
              worktree: {card.worktree.branch}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--surface)]"
        >
          Close
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {card.description ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
              Description
            </h3>
            <p className="text-sm">{card.description}</p>
          </section>
        ) : null}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
            Comments ({comments.length})
          </h3>
          <form onSubmit={submitComment} className="mb-3 flex flex-col gap-2">
            <textarea
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              rows={2}
              placeholder="Add a note…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitting}
              className="self-start rounded bg-[var(--accent)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              Add comment
            </button>
          </form>
          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No comments yet</p>
            ) : (
              comments.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-sm"
                >
                  <p>{entry.message}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    @{entry.actor} · {new Date(entry.at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
            Code changes ({card.codeChanges.length})
          </h3>
          <div className="space-y-2">
            {card.codeChanges.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                Agents record diffs via POST /api/cards/:id/code-changes
              </p>
            ) : (
              card.codeChanges.map((change) => (
                <CodeChangeBlock key={change.id} change={change} />
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
            Journal / audit log ({audit.length})
          </h3>
          <ol className="space-y-2">
            {audit.map((entry) => (
              <li
                key={entry.id}
                className="rounded border border-[var(--border)]/60 px-2 py-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <JournalIcon type={entry.type} />
                  <time className="text-[var(--muted)]">
                    {new Date(entry.at).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1">{entry.message}</p>
                {entry.actor ? (
                  <p className="text-[var(--muted)]">@{entry.actor}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </aside>
  );
}
