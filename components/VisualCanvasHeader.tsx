import Link from "next/link";
import type { VisualBoard, VisualNodeKind } from "@/lib/visual-types";

interface VisualCanvasHeaderProps {
  board: VisualBoard;
  recording: boolean;
  linkFrom: string | null;
  selectedId: string | null;
  addShape: (kind: VisualNodeKind) => Promise<void>;
  setLinkFrom: (id: string | null) => void;
  persistViewport: () => Promise<void>;
  recordToCard: () => Promise<void>;
}

export function VisualCanvasHeader({
  board,
  recording,
  linkFrom,
  selectedId,
  addShape,
  setLinkFrom,
  persistViewport,
  recordToCard,
}: VisualCanvasHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
      <Link href="/visual" className="text-sm text-[var(--accent)]">
        ← Boards
      </Link>
      <h1 className="text-lg font-medium">{board.title}</h1>
      {board.workshopTemplateId ? (
        <span className="rounded bg-purple-900/50 px-2 py-0.5 text-[10px] uppercase text-purple-200">
          {board.workshopTemplateId}
          {board.workshop?.status === "completed" ? " · recorded" : ""}
        </span>
      ) : (
        <span className="text-xs text-[var(--muted)]">{board.boardType}</span>
      )}
      {board.linkedCardId ? (
        <span className="text-xs text-emerald-400">↗ card linked</span>
      ) : null}
      <div className="ml-auto flex flex-wrap gap-1">
        {(
          [
            ["sticky", "Sticky"],
            ["rectangle", "Box"],
            ["diamond", "Decision"],
            ["ellipse", "Oval"],
            ["frame", "Frame"],
            ["wire_button", "Btn"],
            ["wire_input", "Input"],
            ["wire_heading", "H1"],
            ["wire_card", "Card"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            onClick={() => void addShape(kind)}
            className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)]"
          >
            + {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setLinkFrom(linkFrom ? null : selectedId)}
          className={`rounded border px-2 py-1 text-xs ${linkFrom ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"}`}
        >
          {linkFrom ? "Cancel link" : "Link shapes"}
        </button>
        <button
          type="button"
          onClick={() => void persistViewport()}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs"
        >
          Save view
        </button>
        {board.workshopTemplateId && board.linkedCardId ? (
          <button
            type="button"
            disabled={recording}
            onClick={() => void recordToCard()}
            className="rounded border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-300 disabled:opacity-50"
          >
            {recording ? "Recording…" : "Record to card"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
