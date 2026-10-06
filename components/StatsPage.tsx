"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isTopic } from "@/lib/types";
import { MARKET_TOPIC, loadHistory, summarize, type GameMode, type GameResult, type TopicSummary } from "@/lib/history";
import { DonutChart, Legend, topicColor, type Slice } from "./DonutChart";

/** Fewer games than this in a topic and we don't call it a strength or a weakness yet. */
const MIN_FOR_VERDICT = 3;

const FILTERS: { id: GameMode | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "daily", label: "Daily" },
  { id: "practice", label: "Practice" },
];

/** The stats page: which topics you solve and which you miss, across puzzles and markets. */
export default function StatsPage() {
  const [history, setHistory] = useState<GameResult[] | null>(null);
  const [filter, setFilter] = useState<GameMode | "all">("all");

  useEffect(() => setHistory(loadHistory()), []);

  if (!history) return <main className="stats-page" />;

  const topics = summarize(history, filter === "all" ? undefined : filter);
  const played = topics.reduce((n, t) => n + t.played, 0);
  const won = topics.reduce((n, t) => n + t.won, 0);
  const ranked = topics.filter((t) => t.played >= MIN_FOR_VERDICT).sort((a, b) => b.winRate - a.winRate || a.missRate - b.missRate);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;

  const slices = (pick: (t: TopicSummary) => number): Slice[] =>
    topics
      .map((t) => ({ label: t.topic, value: pick(t), color: topicColor(t.topic) }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  const missed = slices((t) => t.lost);
  const solved = slices((t) => t.won);

  return (
    <main className="stats-page">
      <Link href="/" className="legal-back">
        ← Back to Quantdle
      </Link>
      <h1>Your stats</h1>
      <p className="muted small">Every puzzle and market you finish on this device, broken down by topic.</p>

      {history.length > 0 && (
        <nav className="modes stats-filter" role="tablist" aria-label="Which games">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? "on" : ""} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </nav>
      )}

      {played === 0 ? (
        <section className="card center stats-empty">
          <p>{history.length ? `No finished ${filter} games yet.` : "No finished games yet."}</p>
          <p className="muted small">Play a puzzle or a market and your topic breakdown shows up here.</p>
          <Link href="/" className="btn primary">
            Play now →
          </Link>
        </section>
      ) : (
        <>
          <section className="card stat-nums">
            <div>
              <b>{played}</b>
              <span>Played</span>
            </div>
            <div>
              <b>{Math.round((won / played) * 100)}</b>
              <span>Win %</span>
            </div>
            <div>
              <b className="stat-topic">{best?.topic ?? "—"}</b>
              <span>Strongest</span>
            </div>
            <div>
              <b className="stat-topic">{worst?.topic ?? "—"}</b>
              <span>Needs work</span>
            </div>
          </section>

          <div className="chart-cards">
            <section className="card chart-card">
              <h2>Where you miss</h2>
              {missed.length ? (
                <div className="chart-row">
                  <DonutChart
                    slices={missed}
                    center={
                      <>
                        <b>{played - won}</b>
                        <span>missed</span>
                      </>
                    }
                  />
                  <Legend slices={missed} />
                </div>
              ) : (
                <p className="muted small">Nothing missed yet. Impressive.</p>
              )}
            </section>

            <section className="card chart-card">
              <h2>What you solve</h2>
              {solved.length ? (
                <div className="chart-row">
                  <DonutChart
                    slices={solved}
                    center={
                      <>
                        <b>{won}</b>
                        <span>solved</span>
                      </>
                    }
                  />
                  <Legend slices={solved} />
                </div>
              ) : (
                <p className="muted small">No wins yet. Your first one will show up here.</p>
              )}
            </section>
          </div>

          <section className="card">
            <h2>By topic</h2>
            <div className="topic-rows">
              {[...topics]
                .sort((a, b) => b.winRate - a.winRate || b.played - a.played)
                .map((t) => (
                  <TopicRow key={t.topic} t={t} tag={t === best ? "best" : t === worst ? "worst" : null} />
                ))}
            </div>
            <p className="muted small">
              Puzzles count as solved when every step is cracked within six guesses; misses are wrong guesses. Markets count as
              won when they finish in profit; misses are rounds where your mid wasn&apos;t close to fair.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

function TopicRow({ t, tag }: { t: TopicSummary; tag: "best" | "worst" | null }) {
  const pct = Math.round(t.winRate * 100);
  const unit = t.kind === "market" ? "rounds" : "guesses";
  return (
    <div className="topic-row">
      <div className="topic-row-head">
        <span className="legend-dot" style={{ background: topicColor(t.topic) }} />
        <b>{t.topic}</b>
        {tag && <span className={`topic-tag ${tag}`}>{tag === "best" ? "Strongest" : "Needs work"}</span>}
        <span className="topic-row-pct">{pct}%</span>
      </div>
      <div className="topic-bar">
        <span style={{ width: `${pct}%`, background: topicColor(t.topic) }} />
      </div>
      <div className="topic-row-meta muted small">
        <span>
          {t.won}/{t.played} {t.kind === "market" ? "profitable" : "solved"} · {Math.round(t.missRate * 100)}% of {unit} missed
        </span>
        {(isTopic(t.topic) || t.topic === MARKET_TOPIC) && (
          <a className={`topic-practice${tag === "worst" ? " urgent" : ""}`} href={`/?topic=${encodeURIComponent(t.topic)}`}>
            Practice →
          </a>
        )}
      </div>
    </div>
  );
}
