"use client";

import { useState } from "react";

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Colours for each topic in the charts; anything else (e.g. an AI puzzle's category) is grey. */
export const TOPIC_COLORS: Record<string, string> = {
  Probability: "#3f9a62",
  Combinatorics: "#6d5bd0",
  "Expected Value": "#d9a62b",
  Statistics: "#2f8fb0",
  Markets: "#e07a3f",
  "Market making": "#d0507a",
};
export const topicColor = (topic: string) => TOPIC_COLORS[topic] ?? "#7b7f87";

/**
 * A ring chart. Hovering (or focusing) a slice shows its label and share in the middle;
 * otherwise the middle shows `center`.
 */
export function DonutChart({ slices, center, size = 180, unit = "" }: { slices: Slice[]; center: React.ReactNode; size?: number; unit?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((n, s) => n + s.value, 0);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const gap = shown.length > 1 ? 1.2 : 0; // a thin break between slices

  let offset = 0;
  const arcs = shown.map((s) => {
    const len = (s.value / total) * circ;
    const arc = { ...s, dash: Math.max(0, len - gap), offset };
    offset += len;
    return arc;
  });
  const a = active !== null ? arcs[active] : null;

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={shown.map((s) => `${s.label}: ${s.value}${unit}`).join(", ")}>
        <circle cx="50" cy="50" r={r} className="donut-track" />
        {arcs.map((s, i) => (
          <circle
            key={s.label}
            cx="50"
            cy="50"
            r={r}
            className={`donut-slice${active !== null && active !== i ? " dim" : ""}`}
            stroke={s.color}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset}
            style={{ animationDelay: `${i * 60}ms` }}
            tabIndex={0}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>
      <div className="donut-center">
        {a ? (
          <>
            <b>{Math.round((a.value / total) * 100)}%</b>
            <span>{a.label}</span>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  );
}

export function Legend({ slices, unit = "" }: { slices: Slice[]; unit?: string }) {
  return (
    <ul className="legend">
      {slices.map((s) => (
        <li key={s.label}>
          <span className="legend-dot" style={{ background: s.color }} />
          <span className="legend-label">{s.label}</span>
          <b>
            {s.value}
            {unit}
          </b>
        </li>
      ))}
    </ul>
  );
}
