"use client";

import { useEffect, useState } from "react";
import { PERIODS, type LeaderboardResponse, type Period } from "@/lib/types";
import { Avatar, SchoolLogo } from "./Avatar";
import { UserSearch } from "./UserSearch";

const PERIOD_LABEL: Record<Period, string> = { daily: "Daily", weekly: "Weekly", all: "Lifetime" };

function countdown(ms: number) {
  const mins = Math.max(0, Math.floor((ms - Date.now()) / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/** Players and schools, ranked by points for today, this week, or all time. */
export function LeaderboardPanel({
  me,
  mySchoolId,
  onSignIn,
  onOpenPlayer,
}: {
  me: string | null;
  mySchoolId: string | null;
  onSignIn: () => void;
  onOpenPlayer: (username: string) => void;
}) {
  const [type, setType] = useState<"players" | "schools">("players");
  const [period, setPeriod] = useState<Period>("daily");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null);
    setFailed(false);
    fetch(`/api/leaderboard?type=${type}&period=${period}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: LeaderboardResponse) => live && setData(b))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [type, period]);

  const rows = type === "players" ? data?.players ?? [] : data?.schools ?? [];

  return (
    <div className="leaderboard">
      <UserSearch onOpenPlayer={onOpenPlayer} />
      <div className="modes small-tabs" role="tablist" aria-label="Leaderboard type">
        {(["players", "schools"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={type === t} className={type === t ? "on" : ""} onClick={() => setType(t)}>
            {t === "players" ? "Players" : "Schools"}
          </button>
        ))}
      </div>
      <div className="modes small-tabs period-tabs" role="tablist" aria-label="Time period">
        {PERIODS.map((p) => (
          <button key={p} role="tab" aria-selected={period === p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <p className="muted small lb-sub">
        {type === "players" ? "Points earned" : "Points earned by each school's players"}
        {period === "daily" ? " today" : period === "weekly" ? " this week" : ", all time"}
        {data?.resetsAt ? ` · resets in ${countdown(data.resetsAt)}` : ""}
      </p>

      {failed && <p className="muted">Couldn&apos;t load the leaderboard.</p>}
      {!failed && !data && <p className="muted">Loading…</p>}

      {data && rows.length === 0 && (
        <p className="muted">
          {type === "players" ? "Nobody has scored yet. Solve a puzzle while signed in to be first!" : "No school has scored yet. Add your school to your profile and solve a puzzle."}
        </p>
      )}

      {data && type === "players" && data.players && data.players.length > 0 && (
        <ol className="lb-list">
          {data.players.map((p) => (
            <li key={p.username} className={p.username === me ? "me" : ""}>
              <span className="lb-rank">{medal(p.rank)}</span>
              <button className="lb-person" onClick={() => onOpenPlayer(p.username)}>
                <Avatar name={p.username} src={p.avatar} size={30} />
                <span className="lb-name">{p.username}</span>
                {p.school && <SchoolLogo school={p.school} size={20} />}
              </button>
              <span className="lb-score">{p.points.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      {data && type === "schools" && data.schools && data.schools.length > 0 && (
        <ol className="lb-list">
          {data.schools.map((s) => (
            <li key={s.school.id} className={s.school.id === mySchoolId ? "me" : ""}>
              <span className="lb-rank">{medal(s.rank)}</span>
              <span className="lb-person static">
                <SchoolLogo school={s.school} size={30} />
                <span className="lb-name">{s.school.name}</span>
              </span>
              <span className="lb-score">{s.points.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      {data?.me && type === "players" && !data.players?.some((p) => p.username === me) && (
        <ol className="lb-list">
          <li className="me">
            <span className="lb-rank">{data.me.rank ?? "–"}</span>
            <span className="lb-name">You</span>
            <span className="lb-score">{data.me.points.toLocaleString()}</span>
          </li>
        </ol>
      )}
      {data?.me && type === "schools" && !data.schools?.some((s) => s.school.id === mySchoolId) && (
        <ol className="lb-list">
          <li className="me">
            <span className="lb-rank">{data.me.rank ?? "–"}</span>
            <span className="lb-name">Your school</span>
            <span className="lb-score">{data.me.points.toLocaleString()}</span>
          </li>
        </ol>
      )}
      {type === "schools" && me && !mySchoolId && <p className="muted small">Add your school to your profile to put it on this board.</p>}

      {!me && (
        <button className="btn primary wide" onClick={onSignIn}>
          Sign in to join
        </button>
      )}
      {data?.storage === "memory" && <p className="muted small">Dev mode: no database is configured, so the leaderboard resets when the server restarts.</p>}
    </div>
  );
}

function medal(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
}
