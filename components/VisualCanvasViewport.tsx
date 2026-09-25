import React from "react";
import type { VisualBoard, VisualEdge, VisualNode, VisualPresence } from "@/lib/visual-types";
import { renderShape, nodeCenter } from "./VisualCanvasHelpers";

interface VisualCanvasViewportProps {
  board: VisualBoard;
  pan: { x: number; y: number };
  zoom: number;
  remotePresence: VisualPresence[];
  selectedId: string | null;
  linkFrom: string | null;
  dragRef: React.MutableRefObject<{ nodeId: string; ox: number; oy: number } | null>;
  panRef: React.MutableRefObject<{ sx: number; sy: number; px: number; py: number } | null>;
  setSelectedId: (id: string | null) => void;
  setPan: (pan: { x: number; y: number } | ((p: { x: number; y: number }) => { x: number; y: number })) => void;
  setZoom: (zoom: number | ((z: number) => number)) => void;
  setBoard: (board: VisualBoard) => void;
  sendPresence: (clientX: number, clientY: number) => void;
  persistNode: (nodeId: string, patch: Partial<VisualNode>) => Promise<void>;
  onNodeClick: (node: VisualNode, e: React.MouseEvent) => void;
}

export function VisualCanvasViewport({
  board,
  pan,
  zoom,
  remotePresence,
  selectedId,
  linkFrom,
  dragRef,
  panRef,
  setSelectedId,
  setPan,
  setZoom,
  setBoard,
  sendPresence,
  persistNode,
  onNodeClick,
}: VisualCanvasViewportProps) {
  return (
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
        void sendPresence(e.clientX, e.clientY);
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
          {remotePresence.map((p) => (
            <g key={p.sessionId} transform={`translate(${p.x},${p.y})`}>
              <circle r={6} fill="#22d3ee" opacity={0.85} />
              <text x={10} y={4} fill="#22d3ee" fontSize={11}>
                {p.label}
              </text>
            </g>
          ))}
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
  );
}
