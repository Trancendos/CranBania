import React from "react";
import type { VisualBoard, VisualNode } from "@/lib/visual-types";

interface VisualCanvasSidebarProps {
  boardId: string;
  board: VisualBoard;
  selected: VisualNode;
  setBoard: (board: VisualBoard) => void;
  persistNode: (nodeId: string, patch: Partial<VisualNode>) => Promise<void>;
  setSelectedId: (id: string | null) => void;
  reload: () => Promise<void>;
}

export function VisualCanvasSidebar({
  boardId,
  board,
  selected,
  setBoard,
  persistNode,
  setSelectedId,
  reload,
}: VisualCanvasSidebarProps) {
  return (
    <aside className="absolute bottom-4 right-4 w-72 rounded border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
      <p className="mb-2 text-xs text-[var(--muted)]">Selected · {selected.kind}</p>
      <textarea
        value={selected.text}
        onChange={(e) => {
          const text = e.target.value;
          setBoard({
            ...board,
            nodes: board.nodes.map((n) =>
              n.id === selected.id ? { ...n, text } : n,
            ),
          });
        }}
        onBlur={() => void persistNode(selected.id, { text: selected.text })}
        className="mb-2 h-20 w-full rounded border border-[var(--border)] bg-[var(--background)] p-2 text-sm"
      />
      <button
        type="button"
        className="text-xs text-red-400"
        onClick={async () => {
          await fetch(`/api/visual-boards/${boardId}/nodes/${selected.id}`, {
            method: "DELETE",
          });
          setSelectedId(null);
          void reload();
        }}
      >
        Delete shape
      </button>
    </aside>
  );
}
