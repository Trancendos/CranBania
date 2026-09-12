"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisualBoard, VisualNode, VisualNodeKind, VisualPresence } from "@/lib/visual-types";
import { VisualCanvasHeader } from "./VisualCanvasHeader";
import { VisualCanvasViewport } from "./VisualCanvasViewport";
import { VisualCanvasSidebar } from "./VisualCanvasSidebar";

export default function VisualCanvasEditor({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<VisualBoard | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ nodeId: string; ox: number; oy: number } | null>(null);
  const panRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const sessionRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}`,
  );
  const [remotePresence, setRemotePresence] = useState<VisualPresence[]>([]);
  const presenceThrottle = useRef(0);

  const sendPresence = useCallback(
    async (clientX: number, clientY: number) => {
      const now = Date.now();
      if (now - presenceThrottle.current < 400) return;
      presenceThrottle.current = now;
      const x = Math.round((clientX - pan.x) / zoom);
      const y = Math.round((clientY - pan.y) / zoom);
      await fetch(`/api/visual-boards/${boardId}/presence`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionRef.current,
          label: "You",
          x,
          y,
        }),
      });
    },
    [boardId, pan.x, pan.y, zoom],
  );

  useEffect(() => {
    const tick = async () => {
      const res = await fetch(`/api/visual-boards/${boardId}/presence`);
      if (!res.ok) return;
      const data = (await res.json()) as { presence: VisualPresence[] };
      setRemotePresence(
        data.presence.filter((p) => p.sessionId !== sessionRef.current),
      );
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => window.clearInterval(id);
  }, [boardId]);

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
      <VisualCanvasHeader
        board={board}
        recording={recording}
        linkFrom={linkFrom}
        selectedId={selectedId}
        addShape={addShape}
        setLinkFrom={setLinkFrom}
        persistViewport={persistViewport}
        recordToCard={recordToCard}
      />
      <VisualCanvasViewport
        board={board}
        pan={pan}
        zoom={zoom}
        remotePresence={remotePresence}
        selectedId={selectedId}
        linkFrom={linkFrom}
        dragRef={dragRef}
        panRef={panRef}
        setSelectedId={setSelectedId}
        setPan={setPan}
        setZoom={setZoom}
        setBoard={setBoard}
        sendPresence={sendPresence}
        persistNode={persistNode}
        onNodeClick={onNodeClick}
      />
      {selected && (
        <VisualCanvasSidebar
          boardId={boardId}
          board={board}
          selected={selected}
          setBoard={setBoard}
          persistNode={persistNode}
          setSelectedId={setSelectedId}
          reload={reload}
        />
      )}
    </div>
  );
}
