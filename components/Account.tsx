"use client";

import { useEffect, useState } from "react";
import type { LeaderboardResponse, Profile } from "@/lib/types";

/** Sign in / sign up form, or the signed-in profile with a sign-out button. */
export function AccountPanel({ user, onChange }: { user: Profile | null; onChange: (u: Profile | null) => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(action: "login" | "signup" | "logout") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username, password }),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "Something went wrong.");
      setPassword("");
      onChange(body.user);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="account">
        <p className="account-hello">
          Signed in as <b>{user.username}</b>
        </p>
        <div className="stat-nums two">
          <div>
            <b>{user.solved}</b>
            <span>Problems solved</span>
          </div>
          <div>
            <b>{user.rank ? `#${user.rank}` : "–"}</b>
            <span>Leaderboard rank</span>
          </div>
        </div>
        <p className="muted small">
          Every puzzle you solve within 6 guesses, steps in order, earns a point. Each puzzle counts once.
        </p>
        <button className="btn wide" onClick={() => send("logout")} disabled={busy}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form
      className="account"
      onSubmit={(e) => {
        e.preventDefault();
        send(tab);
      }}
    >
      <div className="modes small-tabs" role="tablist">
        {(["login", "signup"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Username</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus maxLength={20} />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={tab === "login" ? "current-password" : "new-password"}
        />
      </label>
      {error && <p className="quote-note bad">{error}</p>}
      <button className="btn primary wide" disabled={busy || !username || !password}>
        {busy ? "…" : tab === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="muted small">Sign in to save your solves and climb the leaderboard. No email needed.</p>
    </form>
  );
}

/** Top solvers, with your own row highlighted. */
export function LeaderboardPanel({ onSignIn }: { onSignIn: () => void }) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="muted">Couldn&apos;t load the leaderboard.</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const meInTop = data.me && data.top.some((t) => t.username === data.me!.username);

  return (
    <div className="leaderboard">
      <p className="muted small">Most problems solved, all time.</p>
      {data.top.length === 0 ? (
        <p className="muted">Nobody on the board yet. Solve a puzzle while signed in to be first!</p>
      ) : (
        <ol className="lb-list">
          {data.top.map((t) => (
            <li key={t.username} className={data.me?.username === t.username ? "me" : ""}>
              <span className="lb-rank">{medal(t.rank)}</span>
              <span className="lb-name">{t.username}</span>
              <span className="lb-score">{t.solved}</span>
            </li>
          ))}
        </ol>
      )}
      {data.me && !meInTop && (
        <ol className="lb-list">
          <li className="me">
            <span className="lb-rank">{data.me.rank ?? "–"}</span>
            <span className="lb-name">{data.me.username}</span>
            <span className="lb-score">{data.me.solved}</span>
          </li>
        </ol>
      )}
      {!data.me && (
        <button className="btn primary wide" onClick={onSignIn}>
          Sign in to join
        </button>
      )}
      {data.storage === "memory" && (
        <p className="muted small">
          Dev mode: no database is configured, so the leaderboard resets when the server restarts.
        </p>
      )}
    </div>
  );
}

function medal(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
}