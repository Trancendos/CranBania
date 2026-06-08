"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { VisualBoard, VisualBoardType } from "@/lib/visual-types";
import { VISUAL_BOARD_TYPES } from "@/lib/visual-types";

export default function VisualBoardList() {
  const [boards, setBoards] = useState<VisualBoard[]>([]);
  const [title, setTitle] = useState("");
  const [boardType, setBoardType] = useState<VisualBoardType>("whiteboard");

  const reload = useCallback(async () => {
    const res = await fetch("/api/visual-boards");
    const data = (await res.json()) as { boards: VisualBoard[] };
    setBoards(data.boards);
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
        Lucid-style flowcharts, Miro-style stickies & frames — JSON-native, agent-ready via MCP.
      </p>

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
              <span className="ml-2 text-xs text-[var(--muted)]">{b.boardType}</span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {b.nodes.length} shapes · {b.edges.length} connectors
              </span>
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
