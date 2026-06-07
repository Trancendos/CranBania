"use client";

import { useCallback, useEffect, useState } from "react";
import BurndownChart from "@/components/BurndownChart";
import type { Epic, Sprint } from "@/lib/types";

interface WorkspaceMeta {
  epicCount: number;
  sprintCount: number;
  activeSprint: Sprint | null;
  summary: {
    openIncidents: number;
    slaBreached: number;
    backlogCount: number;
  };
}

export default function WorkspaceBar({
  sprintFilter,
  onSprintFilter,
  onRefresh,
}: {
  sprintFilter: string | null;
  onSprintFilter: (id: string | null) => void;
  onRefresh: () => void;
}) {
  const [meta, setMeta] = useState<WorkspaceMeta | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprintName, setSprintName] = useState("");
  const [epicTitle, setEpicTitle] = useState("");

  const load = useCallback(async () => {
    const [ws, sp, ep] = await Promise.all([
      fetch("/api/workspace").then((r) => r.json()),
      fetch("/api/sprints").then((r) => r.json()),
      fetch("/api/epics").then((r) => r.json()),
    ]);
    setMeta(ws);
    setSprints(sp.sprints ?? []);
    setEpics(ep.epics ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!sprintName.trim()) return;
    const start = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
    await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sprintName, startDate: start, endDate: end, activate: true }),
    });
    setSprintName("");
    await load();
    onRefresh();
  }

  async function createEpic(e: React.FormEvent) {
    e.preventDefault();
    if (!epicTitle.trim()) return;
    await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: epicTitle }),
    });
    setEpicTitle("");
    await load();
    onRefresh();
  }

  async function exportData() {
    const res = await fetch("/api/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cranbania-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Zero-cost workspace</h2>
          <p className="text-xs text-[var(--muted)]">
            Agile sprints · ITSM-lite · Prince2 tags · no Jira/ServiceNow
          </p>
        </div>
        {meta ? (
          <div className="flex flex-wrap gap-3 text-xs">
            <span>Backlog: {meta.summary.backlogCount}</span>
            <span>Incidents: {meta.summary.openIncidents}</span>
            <span className={meta.summary.slaBreached > 0 ? "text-red-400" : ""}>
              SLA breached: {meta.summary.slaBreached}
            </span>
            <span>Epics: {meta.epicCount}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-xs">
          Sprint filter
          <select
            className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1"
            value={sprintFilter ?? ""}
            onChange={(e) => onSprintFilter(e.target.value || null)}
          >
            <option value="">All sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={createSprint} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs">
            New sprint
            <input
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="Sprint 1"
            />
          </label>
          <button type="submit" className="rounded bg-[var(--accent)] px-3 py-1 text-xs text-white">
            Start
          </button>
        </form>

        <form onSubmit={createEpic} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs">
            New epic
            <input
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1"
              value={epicTitle}
              onChange={(e) => setEpicTitle(e.target.value)}
              placeholder="Epic title"
            />
          </label>
          <button type="submit" className="rounded border border-[var(--border)] px-3 py-1 text-xs">
            Add
          </button>
        </form>

        <button
          type="button"
          onClick={exportData}
          className="self-end rounded border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--surface-hover)]"
        >
          Export JSON
        </button>
      </div>

      {epics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {epics.map((epic) => (
            <span
              key={epic.id}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px]"
            >
              Epic: {epic.title}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        <BurndownChart sprintId={sprintFilter ?? meta?.activeSprint?.id ?? null} />
      </div>
    </section>
  );
}
