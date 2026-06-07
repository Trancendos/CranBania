"use client";

import { useCallback, useEffect, useState } from "react";
import type { Board, Card, Column, ColumnId } from "@/lib/types";

async function fetchBoard(): Promise<Board> {
  const res = await fetch("/api/board");
  if (!res.ok) throw new Error("Failed to load board");
  return res.json();
}

function CardItem({
  card,
  onMove,
  onDelete,
}: {
  card: Card;
  onMove: (id: string, columnId: ColumnId) => void;
  onDelete: (id: string) => void;
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
      <h3 className="font-semibold leading-snug">{card.title}</h3>
      {card.description ? (
        <p className="mt-1 text-sm text-[var(--muted)] line-clamp-3">
          {card.description}
        </p>
      ) : null}
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
}: {
  column: Column;
  cards: Card[];
  onMove: (id: string, columnId: ColumnId) => void;
  onDelete: (id: string) => void;
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

  const reload = useCallback(async () => {
    try {
      const data = await fetchBoard();
      setBoard(data);
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
      body: JSON.stringify({ title, description, tags: ["agent-ready"] }),
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
      body: JSON.stringify({ columnId }),
    });
    await reload();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    await reload();
  }

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
            AI-agent ready
          </p>
          <h1 className="text-3xl font-bold tracking-tight">CranBania</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Kanban for humans and AI agents. Claude, Cursor, and other tools
            can read and update cards via REST API or MCP.
          </p>
        </div>
        <form
          onSubmit={handleCreate}
          className="flex w-full max-w-lg flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:w-auto"
        >
          <input
            className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="New card title"
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
          <button
            type="submit"
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add to Backlog
          </button>
        </form>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            cards={board.cards}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <footer className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">For AI agents:</strong>{" "}
        <code className="text-[var(--accent)]">GET /api/board</code>,{" "}
        <code className="text-[var(--accent)]">POST /api/cards</code>,{" "}
        <code className="text-[var(--accent)]">POST /api/cards/:id/move</code>
        {" · "}
        MCP: <code className="text-[var(--accent)]">npm run mcp</code>
      </footer>
    </div>
  );
}
