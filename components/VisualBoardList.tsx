"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { VisualBoard, VisualBoardType } from "@/lib/visual-types";
import { VISUAL_BOARD_TYPES } from "@/lib/visual-types";

interface WorkshopTemplateSummary {
  id: string;
  name: string;
  category: string;
  description: string;
}

export default function VisualBoardList() {
  const [boards, setBoards] = useState<VisualBoard[]>([]);
  const [templates, setTemplates] = useState<WorkshopTemplateSummary[]>([]);
  const [title, setTitle] = useState("");
  const [boardType, setBoardType] = useState<VisualBoardType>("whiteboard");
  const [workshopTemplateId, setWorkshopTemplateId] = useState("");

  const reload = useCallback(async () => {
    const [boardsRes, templatesRes] = await Promise.all([
      fetch("/api/visual-boards"),
      fetch("/api/workshops/templates"),
    ]);
    const boardsData = (await boardsRes.json()) as { boards: VisualBoard[] };
    const templatesData = (await templatesRes.json()) as { templates: WorkshopTemplateSummary[] };
    setBoards(boardsData.boards);
    setTemplates(templatesData.templates ?? []);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/visual-boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), boardType }),
    });
    setTitle("");
    void reload();
  }

  return (
    <div className="mx-auto max-w-4xl p-8 pt-20">
      <h1 className="mb-2 text-2xl font-semibold">Visual boards</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Lucid-style flowcharts, Miro-style stickies, and smart workshop templates — agent-ready via MCP.
      </p>

      <section className="mb-8 rounded border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-2 text-sm font-semibold">Smart workshop templates</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Start from a card detail panel, or pick a template below. AI agents use{" "}
          <code className="text-[var(--accent)]">start_workshop_from_card</code> →{" "}
          <code className="text-[var(--accent)]">populate_workshop_zones</code> →{" "}
          <code className="text-[var(--accent)]">record_workshop_outcomes</code>.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.slice(0, 8).map((t) => (
            <div
              key={t.id}
              className="rounded border border-[var(--border)]/60 px-3 py-2 text-xs"
            >
              <span className="font-medium">{t.name}</span>
              <span className="ml-2 text-[var(--muted)]">{t.category}</span>
              <p className="mt-1 text-[var(--muted)]">{t.description}</p>
            </div>
          ))}
        </div>
        {templates.length > 8 ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            +{templates.length - 8} more — see GET /api/workshops/templates
          </p>
        ) : null}
      </section>

      <form onSubmit={createBoard} className="mb-8 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Board title"
          className="min-w-[200px] flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        />
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value as VisualBoardType)}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        >
          {VISUAL_BOARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={workshopTemplateId}
          onChange={(e) => setWorkshopTemplateId(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          title="Workshop templates are started from Kanban cards"
        >
          <option value="">Workshop (from card…)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-[var(--accent)] px-4 py-2 font-medium text-black"
        >
          Create
        </button>
      </form>

      <ul className="space-y-2">
        {boards.map((b) => (
          <li key={b.id}>
            <Link
              href={`/visual/${b.id}`}
              className="block rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:bg-[var(--surface-hover)]"
            >
              <span className="font-medium">{b.title}</span>
              {b.workshopTemplateId ? (
                <span className="ml-2 rounded bg-purple-900/40 px-1.5 py-0.5 text-[10px] text-purple-200">
                  workshop: {b.workshopTemplateId}
                </span>
              ) : (
                <span className="ml-2 text-xs text-[var(--muted)]">{b.boardType}</span>
              )}
              <span className="ml-2 text-xs text-[var(--muted)]">
                {b.nodes.length} shapes · {b.edges.length} connectors
              </span>
              {b.linkedCardId ? (
                <span className="ml-2 text-xs text-emerald-400">linked card</span>
              ) : null}
            </Link>
          </li>
        ))}
        {boards.length === 0 && (
          <li className="text-sm text-[var(--muted)]">No boards yet — create one above.</li>
        )}
      </ul>
    </div>
  );
}
