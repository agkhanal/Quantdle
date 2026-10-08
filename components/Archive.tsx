"use client";

import { useEffect, useMemo, useState } from "react";
import { dayLabel, localMarketStatus, localPuzzleStatus, marketInfo, type DayStatus } from "@/lib/archive";
import type { ArchiveResponse, Difficulty } from "@/lib/types";
import { StatusIcon } from "./TrackIcons";

type Track = "puzzle" | "market";

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };
const STATUS_TEXT: Record<DayStatus, string> = { won: "Solved", lost: "Not solved", playing: "In progress", new: "Not played" };
const MARKET_TEXT: Record<DayStatus, string> = { won: "Finished in profit", lost: "Finished at a loss", playing: "In progress", new: "Not played" };

interface Row {
  day: number;
  title: string;
  sub: string;
  difficulty: Difficulty;
  status: DayStatus;
  today?: boolean;
}

/** The list of past dailies. Picking one replays it in the Daily tab, scored at half points. */
export function ArchivePanel({
  track: initialTrack,
  signedIn,
  onPick,
  onToday,
}: {
  track: Track;
  signedIn: boolean;
  onPick: (day: number, track: Track) => void;
  onToday: () => void;
}) {
  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [track, setTrack] = useState<Track>(initialTrack);

  useEffect(() => {
    let live = true;
    fetch("/api/archive")
      .then((r) => (r.ok ? (r.json() as Promise<ArchiveResponse>) : Promise.reject()))
      .then((b) => live && setData(b))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [signedIn]);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const statusOf = (day: number): DayStatus => {
      if (track === "market") return localMarketStatus(day);
      return data.results[day] ?? localPuzzleStatus(day); // your account's record wins over this browser's
    };
    const todayInfo = track === "market" ? marketInfo(data.today) : null;
    const today: Row = {
      day: data.today,
      title: "Today's daily",
      sub: todayInfo ? `${dayLabel(data.today)} · Market making` : dayLabel(data.today),
      difficulty: todayInfo?.difficulty ?? data.current.difficulty,
      status: statusOf(data.today),
      today: true,
    };
    const past = data.days.map<Row>((d) => {
      if (track === "market") {
        const m = marketInfo(d.day);
        return { day: d.day, title: m.name, sub: `${dayLabel(d.day)} · Market making`, difficulty: m.difficulty, status: statusOf(d.day) };
      }
      return { day: d.day, title: d.title, sub: `${dayLabel(d.day)} · ${d.category}`, difficulty: d.difficulty, status: statusOf(d.day) };
    });
    return [today, ...past];
  }, [data, track]);

  const past = rows.filter((r) => !r.today);
  const finished = past.filter((r) => r.status === "won" || r.status === "lost").length;

  return (
    <div className="archive">
      <div className="modes small-tabs" role="tablist" aria-label="Game type">
        {(["puzzle", "market"] as Track[]).map((t) => (
          <button key={t} role="tab" aria-selected={track === t} className={track === t ? "on" : ""} onClick={() => setTrack(t)}>
            {t === "puzzle" ? "Puzzle" : "Market"}
          </button>
        ))}
      </div>

      <p className="muted small archive-note">
        {track === "puzzle"
          ? "Replay any daily you missed. Past dailies pay half points and don't count toward your streak."
          : "Replay any daily market you missed. Each one is the same contract everyone played that day."}
      </p>

      {failed && <p className="muted small archive-empty">Couldn&apos;t load the archive. Try again in a moment.</p>}
      {!data && !failed && <p className="muted small archive-empty">Loading…</p>}

      {data && past.length === 0 && <p className="muted small archive-empty">Nothing to replay yet. The first past daily appears tomorrow.</p>}

      {data && (
        <>
          {past.length > 0 && (
            <div className="archive-summary muted small">
              {finished} of {past.length} played
            </div>
          )}
          <ul className="archive-list">
            {rows.map((r) => (
              <li key={r.day}>
                <button className={`archive-row${r.today ? " today" : ""}`} onClick={() => (r.today ? onToday() : onPick(r.day, track))}>
                  <span className="archive-num">#{r.day}</span>
                  <span className="archive-main">
                    <b>{r.title}</b>
                    <span className="muted small">{r.sub}</span>
                  </span>
                  <span className={`chip diff-${r.difficulty}`}>{DIFF_LABEL[r.difficulty]}</span>
                  <span className={`archive-status ${r.status}`} title={track === "market" ? MARKET_TEXT[r.status] : STATUS_TEXT[r.status]} role="img" aria-label={track === "market" ? MARKET_TEXT[r.status] : STATUS_TEXT[r.status]}>
                    <StatusIcon status={r.status} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
