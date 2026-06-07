"use client";

import { useCallback, useEffect, useState } from "react";
import type { Card } from "@/lib/types";
import { computeSlaStatus, formatSlaRemaining } from "@/lib/sla";

interface IncidentRow {
  card: Card;
  sla: ReturnType<typeof computeSlaStatus>;
}

const COLUMN_LABELS: Record<string, string> = {
  backlog: "Backlog",
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export default function IncidentQueue() {
  const [rows, setRows] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/itsm/incidents");
      if (res.ok) {
        const json = await res.json();
        setRows(json.incidents ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const visible = rows.filter((r) =>
    filter === "open" ? r.card.columnId !== "done" : true,
  );

  const breached = visible.filter((r) => r.sla.breached && !r.sla.resolved).length;

  async function moveCard(id: string, columnId: string) {
    await fetch(`/api/cards/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, actor: "itsm-queue" }),
    });
    await load();
  }

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">ITSM-lite</p>
          <h1 className="text-3xl font-bold tracking-tight">Incident queue</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Dedicated view for incident cards — SLA status, priority, and quick
            triage without Jira or ServiceNow.
          </p>
        </div>
      </header>

      <section className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex gap-4 text-sm">
          <span>Open: {visible.length}</span>
          <span className={breached > 0 ? "text-red-400" : ""}>
            SLA breached: {breached}
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs">
          Show
          <select
            className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1"
            value={filter}
            onChange={(e) => setFilter(e.target.value as "open" | "all")}
          >
            <option value="open">Open only</option>
            <option value="all">All incidents</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--surface-hover)]"
        >
          Refresh
        </button>
      </section>

      {loading && rows.length === 0 ? (
        <p className="text-[var(--muted)]">Loading incidents…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No incidents in queue. Create an incident card from the Kanban board.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Column</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible
                .sort((a, b) => {
                  if (a.sla.breached !== b.sla.breached) return a.sla.breached ? -1 : 1;
                  const pa = { critical: 0, high: 1, medium: 2, low: 3 };
                  return pa[a.card.priority] - pa[b.card.priority];
                })
                .map(({ card, sla }) => (
                  <tr
                    key={card.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{card.title}</p>
                      {card.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">
                          {card.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          card.priority === "critical"
                            ? "text-red-400"
                            : card.priority === "high"
                              ? "text-amber-400"
                              : ""
                        }
                      >
                        {card.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {COLUMN_LABELS[card.columnId] ?? card.columnId}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {sla.resolved ? (
                        <span className="text-emerald-400">Resolved</span>
                      ) : sla.breached ? (
                        <span className="text-red-400">Breached</span>
                      ) : sla.remainingMs != null ? (
                        formatSlaRemaining(sla.remainingMs)
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {card.assignee ? `@${card.assignee}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {card.columnId !== "in_progress" && card.columnId !== "done" ? (
                        <button
                          type="button"
                          className="rounded bg-[var(--accent)] px-2 py-1 text-xs text-white"
                          onClick={() => void moveCard(card.id, "in_progress")}
                        >
                          Start work
                        </button>
                      ) : card.columnId === "in_progress" ? (
                        <button
                          type="button"
                          className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                          onClick={() => void moveCard(card.id, "review")}
                        >
                          → Review
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="mt-8 text-xs text-[var(--muted)]">
        SLA breach webhooks: <code className="text-[var(--accent)]">card.sla_breach</code>
        {" · "}
        Cron check: <code className="text-[var(--accent)]">POST /api/itsm/sla/check</code>
      </footer>
    </div>
  );
}
