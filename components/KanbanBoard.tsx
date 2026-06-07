"use client";

import { useCallback, useEffect, useState } from "react";
import CardDetailPanel from "@/components/CardDetailPanel";
import WorkspaceBar from "@/components/WorkspaceBar";
import type { Board, Card, CardType, Column, ColumnId } from "@/lib/types";
import { formatSlaRemaining, computeSlaStatus } from "@/lib/sla";

async function fetchBoard(): Promise<Board> {
  const res = await fetch("/api/board");
  if (!res.ok) throw new Error("Failed to load board");
  return res.json();
}

function CardItem({
  card,
  onMove,
  onDelete,
  onSelect,
}: {
  card: Card;
  onMove: (id: string, columnId: ColumnId) => void;
  onDelete: (id: string) => void;
  onSelect: (card: Card) => void;
}) {
  const columns: { id: ColumnId; label: string }[] = [
    { id: "backlog", label: "Backlog" },
    { id: "planning", label: "Planning" },
    { id: "in_progress", label: "In Progress" },
    { id: "review", label: "Review" },
    { id: "done", label: "Done" },
  ];

  return (
    <article
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition hover:border-[var(--accent)]"
      data-card-id={card.id}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onSelect(card)}
      >
        <h3 className="font-semibold leading-snug">{card.title}</h3>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[10px] uppercase">
            {card.cardType}
          </span>
          {card.priority !== "medium" ? (
            <span className="rounded bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
              {card.priority}
            </span>
          ) : null}
          {card.slaDueAt && card.columnId !== "done" ? (
            <span
              className={
                computeSlaStatus(card).breached
                  ? "text-[10px] text-red-400"
                  : "text-[10px] text-[var(--muted)]"
              }
            >
              SLA:{" "}
              {computeSlaStatus(card).breached
                ? "breached"
                : formatSlaRemaining(computeSlaStatus(card).remainingMs ?? 0)}
            </span>
          ) : null}
        </div>
        {card.description ? (
          <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
            {card.description}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
          {card.journal.filter((j) => j.type === "comment").length > 0 ? (
            <span>
              💬 {card.journal.filter((j) => j.type === "comment").length}
            </span>
          ) : null}
          {card.codeChanges.length > 0 ? (
            <span>⌘ {card.codeChanges.length} diffs</span>
          ) : null}
          {card.worktree ? <span className="text-emerald-400">⎇ branch</span> : null}
        </div>
      </button>
      {card.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-xs text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {card.assignee ? (
        <p className="mt-2 text-xs text-[var(--muted)]">@{card.assignee}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1">
        <select
          className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
          value={card.columnId}
          onChange={(e) => onMove(card.id, e.target.value as ColumnId)}
          aria-label={`Move ${card.title}`}
        >
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              → {col.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)]"
          onClick={() => onSelect(card)}
        >
          Journal
        </button>
        <button
          type="button"
          className="rounded border border-[var(--border)] px-2 py-1 text-xs text-red-400 hover:bg-red-950/30"
          onClick={() => onDelete(card.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function ColumnView({
  column,
  cards,
  onMove,
  onDelete,
  onSelect,
}: {
  column: Column;
  cards: Card[];
  onMove: (id: string, columnId: ColumnId) => void;
  onDelete: (id: string) => void;
  onSelect: (card: Card) => void;
}) {
  const columnCards = cards
    .filter((c) => c.columnId === column.id)
    .sort((a, b) => a.order - b.order);

  return (
    <section
      className="flex min-w-[260px] flex-1 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)]/50"
      data-column-id={column.id}
    >
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {column.title}
        </h2>
        <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-xs">
          {columnCards.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {columnCards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            onMove={onMove}
            onDelete={onDelete}
            onSelect={onSelect}
          />
        ))}
        {columnCards.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--muted)]">
            No cards
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default function KanbanBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backlogCount, setBacklogCount] = useState(0);
  const [sprintFilter, setSprintFilter] = useState<string | null>(null);
  const [cardType, setCardType] = useState<CardType>("task");

  const reload = useCallback(async () => {
    try {
      const [data, summaryRes] = await Promise.all([
        fetchBoard(),
        fetch("/api/summary"),
      ]);
      setBoard(data);
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        setBacklogCount(summary.backlogCount ?? 0);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const interval = setInterval(() => void reload(), 5000);
    return () => clearInterval(interval);
  }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        tags: ["agent-ready"],
        cardType,
        sprintId: sprintFilter ?? undefined,
      }),
    });
    if (!res.ok) {
      setError("Failed to create card");
      return;
    }
    setTitle("");
    setDescription("");
    await reload();
  }

  async function handleMove(id: string, columnId: ColumnId) {
    await fetch(`/api/cards/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, actor: "human" }),
    });
    await reload();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    await reload();
  }

  const selectedCard =
    board?.cards.find((c) => c.id === selectedId) ?? null;

  const visibleCards =
    sprintFilter && board
      ? board.cards.filter((c) => c.sprintId === sprintFilter)
      : board?.cards ?? [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        Loading board…
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400">
        {error ?? "Board unavailable"}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            AI-agent ready · journal · worktrees · webhooks
          </p>
          <h1 className="text-3xl font-bold tracking-tight">CranBania</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Backlog ({backlogCount} items) · cards carry audit journal, comments,
            code diffs, and isolated git worktrees when moved to In Progress.
          </p>
        </div>
        <form
          onSubmit={handleCreate}
          className="flex w-full max-w-lg flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:w-auto"
        >
          <input
            className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="New card title → Backlog"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="Description (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={cardType}
            onChange={(e) => setCardType(e.target.value as CardType)}
          >
            <option value="task">Task</option>
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="incident">Incident (ITSM)</option>
            <option value="change">Change (ITSM)</option>
          </select>
          <button
            type="submit"
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add to Backlog
          </button>
        </form>
      </header>

      <WorkspaceBar
        sprintFilter={sprintFilter}
        onSprintFilter={setSprintFilter}
        onRefresh={reload}
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            cards={visibleCards}
            onMove={handleMove}
            onDelete={handleDelete}
            onSelect={(c) => setSelectedId(c.id)}
          />
        ))}
      </div>

      {selectedCard ? (
        <CardDetailPanel
          card={selectedCard}
          onClose={() => setSelectedId(null)}
          onUpdated={reload}
        />
      ) : null}

      <footer className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Agent APIs:</strong>{" "}
        <code className="text-[var(--accent)]">GET /api/backlog</code>,{" "}
        <code className="text-[var(--accent)]">POST /api/cards/:id/comments</code>,{" "}
        <code className="text-[var(--accent)]">POST /api/cards/:id/code-changes</code>,{" "}
        <code className="text-[var(--accent)]">GET /api/cards/:id/journal</code>
        {" · "}
        Webhooks: <code className="text-[var(--accent)]">card.in_progress</code>,{" "}
        <code className="text-[var(--accent)]">card.sla_breach</code>
        {" · "}
        <code className="text-[var(--accent)]">POST /api/itsm/sla/check</code>
      </footer>
    </div>
  );
}
