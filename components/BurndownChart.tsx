"use client";

import { useCallback, useEffect, useState } from "react";
import type { SprintBurndown } from "@/lib/workspace";

export default function BurndownChart({ sprintId }: { sprintId: string | null }) {
  const [data, setData] = useState<SprintBurndown | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!sprintId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/burndown`);
      if (res.ok) {
        const json = await res.json();
        setData(json.burndown ?? null);
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!sprintId) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Select a sprint to view burndown (story points).
      </p>
    );
  }

  if (loading && !data) {
    return <p className="text-xs text-[var(--muted)]">Loading burndown…</p>;
  }

  if (!data || data.series.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)]">No burndown data for this sprint.</p>
    );
  }

  const width = 480;
  const height = 160;
  const pad = { top: 12, right: 12, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxY = Math.max(
    data.totalPoints,
    ...data.series.map((p) => Math.max(p.remaining, p.ideal)),
    1,
  );

  const x = (i: number) =>
    pad.left + (i / Math.max(1, data.series.length - 1)) * innerW;
  const y = (v: number) => pad.top + innerH - (v / maxY) * innerH;

  const remainingPath = data.series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.remaining)}`)
    .join(" ");
  const idealPath = data.series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.ideal)}`)
    .join(" ");

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{data.sprintName} burndown</h3>
          <p className="text-[10px] text-[var(--muted)]">
            {data.startDate} → {data.endDate} · {data.donePoints}/{data.totalPoints}{" "}
            pts done · {data.remainingCards} cards left
          </p>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 bg-[var(--accent)]" />
            Actual
          </span>
          <span className="flex items-center gap-1 text-[var(--muted)]">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-[var(--muted)]" />
            Ideal
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-xl"
        role="img"
        aria-label={`Sprint burndown chart for ${data.sprintName}`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = Math.round(maxY * (1 - t));
          const yy = pad.top + innerH * t;
          return (
            <g key={t}>
              <line
                x1={pad.left}
                y1={yy}
                x2={width - pad.right}
                y2={yy}
                stroke="var(--border)"
                strokeWidth={0.5}
              />
              <text
                x={pad.left - 4}
                y={yy + 3}
                textAnchor="end"
                fill="var(--muted)"
                fontSize={8}
              >
                {val}
              </text>
            </g>
          );
        })}
        <path
          d={idealPath}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <path
          d={remainingPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        {data.series.map((p, i) =>
          i % Math.ceil(data.series.length / 5) === 0 || i === data.series.length - 1 ? (
            <text
              key={p.date}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize={7}
            >
              {p.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
