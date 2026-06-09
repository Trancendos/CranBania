"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VisualBoard, VisualEdge, VisualNode, VisualNodeKind } from "@/lib/visual-types";

function nodeCenter(n: VisualNode) {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

function renderShape(node: VisualNode, selected: boolean) {
  const stroke = selected ? "var(--accent)" : "var(--border)";
  const fill =
    node.kind === "sticky"
      ? node.color ?? "#fef08a"
      : node.kind === "frame"
        ? "transparent"
        : node.color ?? "var(--surface)";

  const common = {
    stroke,
    strokeWidth: selected ? 2 : 1,
    fill,
  };

  switch (node.kind) {
    case "ellipse":
      return (
        <ellipse
          cx={node.width / 2}
          cy={node.height / 2}
          rx={node.width / 2}
          ry={node.height / 2}
          {...common}
        />
      );
    case "diamond": {
      const w = node.width / 2;
      const h = node.height / 2;
      return (
        <polygon
          points={`${w},0 ${node.width},${h} ${w},${node.height} 0,${h}`}
          {...common}
        />
      );
    }
    case "frame":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={4}
          strokeDasharray="6 4"
          {...common}
        />
      );
    case "wire_button":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={8}
          fill={node.color ?? "#6366f1"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
        />
      );
    case "wire_input":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={4}
          fill={node.color ?? "#334155"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
        />
      );
    case "wire_image":
      return (
        <>
          <rect
            width={node.width}
            height={node.height}
            rx={4}
            fill={node.color ?? "#475569"}
            stroke={stroke}
            strokeWidth={selected ? 2 : 1}
          />
          <line
            x1={8}
            y1={node.height - 12}
            x2={node.width - 8}
            y2={12}
            stroke="#94a3b8"
            strokeWidth={1}
          />
        </>
      );
    case "wire_nav":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={0}
          fill={node.color ?? "#475569"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
        />
      );
    case "wire_divider":
      return (
        <rect
          width={node.width}
          height={node.height}
          fill={node.color ?? "#64748b"}
          stroke="none"
        />
      );
    case "wire_checkbox":
    case "wire_heading":
    case "wire_label":
    case "wire_card":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={node.kind === "wire_card" ? 8 : 4}
          fill={node.kind === "wire_card" ? (node.color ?? "#334155") : "transparent"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={node.kind === "wire_label" ? "4 2" : undefined}
        />
      );
    default:
      return <rect width={node.width} height={node.height} rx={6} {...common} />;
  }
}

export default function VisualCanvasEditor({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<VisualBoard | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ nodeId: string; ox: number; oy: number } | null>(null);
  const panRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/visual-boards/${boardId}`);
    if (!res.ok) return;
    const data = (await res.json()) as { board: VisualBoard };
    setBoard(data.board);
    setPan({ x: data.board.viewport.x, y: data.board.viewport.y });
    setZoom(data.board.viewport.zoom);
  }, [boardId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persistViewport = useCallback(async () => {
    await fetch(`/api/visual-boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewport: { x: pan.x, y: pan.y, zoom } }),
    });
  }, [boardId, pan, zoom]);

  const persistNode = useCallback(
    async (nodeId: string, patch: Partial<VisualNode>) => {
      const res = await fetch(`/api/visual-boards/${boardId}/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = (await res.json()) as { board: VisualBoard };
        setBoard(data.board);
      }
    },
    [boardId],
  );

  async function addShape(kind: VisualNodeKind) {
    const res = await fetch(`/api/visual-boards/${boardId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        x: Math.round((200 - pan.x) / zoom),
        y: Math.round((160 - pan.y) / zoom),
        text: kind === "sticky" ? "Sticky" : "Shape",
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { board: VisualBoard };
      setBoard(data.board);
    }
  }

  async function addEdge(from: string, to: string) {
    const res = await fetch(`/api/visual-boards/${boardId}/edges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromNodeId: from, toNodeId: to }),
    });
    if (res.ok) {
      const data = (await res.json()) as { board: VisualBoard };
      setBoard(data.board);
    }
  }

  function onNodeClick(node: VisualNode, e: React.MouseEvent) {
    e.stopPropagation();
    if (linkFrom) {
      if (linkFrom !== node.id) void addEdge(linkFrom, node.id);
      setLinkFrom(null);
      return;
    }
    setSelectedId(node.id);
  }

  async function recordToCard() {
    if (!board?.linkedCardId || !board.workshopTemplateId) return;
    setRecording(true);
    await fetch(`/api/workshops/${boardId}/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "human" }),
    });
    setRecording(false);
    await reload();
  }

  if (!board) {
    return <div className="p-20 text-center text-[var(--muted)]">Loading canvas…</div>;
  }

  const selected = board.nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex h-screen flex-col pt-14">
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

      <div
        className="relative flex-1 overflow-hidden bg-[#0a0e14]"
        onMouseDown={(e) => {
          if (e.button !== 1 && e.button !== 0) return;
          if ((e.target as HTMLElement).dataset.canvasBg === "1") {
            setSelectedId(null);
            if (e.button === 1 || e.altKey) {
              panRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
            }
          }
        }}
        onMouseMove={(e) => {
          if (dragRef.current && board) {
            const d = dragRef.current;
            const node = board.nodes.find((n) => n.id === d.nodeId);
            if (!node) return;
            const nx = (e.clientX - d.ox) / zoom;
            const ny = (e.clientY - d.oy) / zoom;
            setBoard({
              ...board,
              nodes: board.nodes.map((n) =>
                n.id === d.nodeId ? { ...n, x: Math.round(nx), y: Math.round(ny) } : n,
              ),
            });
          }
          if (panRef.current) {
            const p = panRef.current;
            setPan({
              x: p.px + (e.clientX - p.sx),
              y: p.py + (e.clientY - p.sy),
            });
          }
        }}
        onMouseUp={() => {
          if (dragRef.current) {
            const d = dragRef.current;
            const node = board.nodes.find((n) => n.id === d.nodeId);
            if (node) void persistNode(d.nodeId, { x: node.x, y: node.y });
          }
          dragRef.current = null;
          panRef.current = null;
        }}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => Math.min(2.5, Math.max(0.4, z - e.deltaY * 0.001)));
        }}
        data-canvas-bg="1"
      >
        <svg className="h-full w-full" data-canvas-bg="1">
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {board.edges.map((edge: VisualEdge) => {
              const from = board.nodes.find((n) => n.id === edge.fromNodeId);
              const to = board.nodes.find((n) => n.id === edge.toNodeId);
              if (!from || !to) return null;
              const a = nodeCenter(from);
              const b = nodeCenter(to);
              return (
                <g key={edge.id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--muted)"
                    strokeWidth={2}
                    markerEnd="url(#arrow)"
                  />
                  {edge.label && (
                    <text
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 6}
                      fill="var(--muted)"
                      fontSize={12}
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--muted)" />
              </marker>
            </defs>
            {board.nodes.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  dragRef.current = {
                    nodeId: node.id,
                    ox: e.clientX - node.x * zoom - pan.x,
                    oy: e.clientY - node.y * zoom - pan.y,
                  };
                }}
                onClick={(e) => onNodeClick(node, e)}
                style={{ cursor: "move" }}
              >
                {renderShape(node, node.id === selectedId || node.id === linkFrom)}
                <text
                  x={node.width / 2}
                  y={node.height / 2}
                  fill={node.kind === "sticky" ? "#1a1a1a" : "var(--foreground)"}
                  fontSize={13}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {node.text.length > 24 ? `${node.text.slice(0, 22)}…` : node.text}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {selected && (
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
      )}
    </div>
  );
}
