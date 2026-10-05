"use client";

import { useEffect, useState } from "react";
import type { LeaderboardResponse, Profile } from "@/lib/types";

export const AUTH_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Try again.",
  google_disabled: "Google sign-in isn't set up on this server.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
};

/** Sign in / sign up form, or the signed-in profile with a sign-out button. */
export function AccountPanel({
  user,
  onChange,
  google = false,
  initialError = "",
  pending = null,
  onSignedIn,
}: {
  user: Profile | null;
  onChange: (u: Profile | null) => void;
  google?: boolean;
  initialError?: string;
  pending?: string | null;
  onSignedIn?: () => void;
}) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState(pending ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function send(action: "login" | "signup" | "logout" | "google_username") {
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
      if (body.user) onSignedIn?.();
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

  if (pending !== null) {
    return (
      <form
        className="account"
        onSubmit={(e) => {
          e.preventDefault();
          send("google_username");
        }}
      >
        <p className="account-hello">
          Signed in with Google. Choose the username that will appear on the leaderboard. You can&apos;t change it later.
        </p>
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" autoFocus maxLength={20} />
        </label>
        {error && <p className="quote-note bad">{error}</p>}
        <button className="btn primary wide" disabled={busy || !username}>
          {busy ? "…" : "Continue"}
        </button>
        <p className="muted small">3–20 characters: letters, numbers, _ or -. Your Google email is never shown or stored.</p>
      </form>
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
      {google && (
        <>
          <a className="btn wide google-btn" href="/api/auth/google">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
              <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            Continue with Google
          </a>
          <p className="muted small or-line">or use a username</p>
        </>
      )}
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