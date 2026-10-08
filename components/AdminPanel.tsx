"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ActivityEvent, ActivityType, Profile } from "@/lib/types";
import { AdminBugs } from "./AdminBugs";
import { AdminReports } from "./AdminReports";
import { AdminTag } from "./AdminTag";
import { useSwap } from "./useSwap";

const KEEP = 500;
const STORE_KEY = "quantdle-admin-open";

const FILTERS: { key: string; label: string; types: ActivityType[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "games", label: "Games", types: ["guess", "hint", "win", "loss", "egg"] },
  { key: "profile", label: "Profile", types: ["profile"] },
  { key: "accounts", label: "Accounts", types: ["account"] },
  { key: "chat", label: "Chat", types: ["chat"] },
  { key: "bugs", label: "Bugs", types: ["bug"] },
  { key: "reports", label: "Reports", types: ["report"] },
  { key: "admin", label: "Admin", types: ["admin"] },
];

const LABEL: Record<ActivityType, string> = {
  account: "account",
  guess: "guess",
  hint: "hint",
  win: "win",
  loss: "loss",
  profile: "profile",
  chat: "chat",
  admin: "admin",
  egg: "egg",
  bug: "bug",
  report: "report",
};

function stamp(at: number, now: number) {
  const d = new Date(at);
  const time = d.toLocaleTimeString([], { hour12: false });
  return now - at > 12 * 3600_000 ? `${d.getMonth() + 1}/${d.getDate()} ${time}` : time;
}

/** Add (or remove, with a negative number) points for any player. Applied on every leaderboard and logged. */
function AdjustPoints({ me, onChange }: { me: Profile; onChange: (u: Profile) => void }) {
  const [username, setUsername] = useState(me.username);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function apply() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), points: Number(points), reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "That didn't work.");
      setNote(`${body.profile.username} now has ${body.profile.points.toLocaleString()} points.`);
      // Start fresh for the next adjustment (the note above keeps the confirmation).
      setUsername("");
      setPoints("");
      setReason("");
      if (body.profile.username === me.username) onChange(body.profile);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`admin-points${open ? " open" : ""}`}>
      <button className="admin-points-toggle" aria-expanded={open} aria-controls="admin-points-body" onClick={() => setOpen((o) => !o)}>
        <svg className="admin-points-chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 1l6 4-6 4z" fill="currentColor" />
        </svg>
        Admin: adjust points
      </button>
      <div className="admin-points-body" id="admin-points-body" inert={!open}>
       <div className="admin-points-clip">
      <div className="profile-form">
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" maxLength={20} />
        </label>
        <label className="field">
          <span>Points (negative to remove)</span>
          <input value={points} onChange={(e) => setPoints(e.target.value)} inputMode="numeric" placeholder="10000" autoComplete="off" />
        </label>
        <label className="field">
          <span>Reason (saved in the log)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} autoComplete="off" maxLength={200} />
        </label>
        {error && <p className="quote-note bad">{error}</p>}
        {note && <p className="muted small">{note}</p>}
        <button className="btn primary wide" disabled={busy || !username.trim() || !/^-?\d+$/.test(points.trim()) || Number(points) === 0} onClick={apply}>
          {busy ? "…" : "Apply"}
        </button>
      </div>
       </div>
      </div>
    </div>
  );
}

/** Admin-only activity log (and points tool) in a left-hand drawer. Opening it pushes the page to the right. */
export function AdminPanel({ me, onMeChange, onOpenPlayer }: { me: Profile; onMeChange: (u: Profile) => void; onOpenPlayer: (username: string) => void }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]); // newest first
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"activity" | "bugs" | "reports">("activity");
  const [bugsOpen, setBugsOpen] = useState(0);
  const [reportsOpen, setReportsOpen] = useState(0);
  const [swapping, swap] = useSwap();

  const list = useRef<HTMLDivElement>(null);
  const lastId = useRef<number | null>(null);
  const idle = useRef(0);
  const keep = useRef<{ top: number; height: number } | null>(null);

  // Remember whether the drawer was open.
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(STORE_KEY) === "1");
    } catch {}
  }, []);

  // Pushing the page over is just a class on <body> (see the CSS).
  useEffect(() => {
    document.body.classList.toggle("admin-open", open);
    try {
      localStorage.setItem(STORE_KEY, open ? "1" : "0");
    } catch {}
    return () => document.body.classList.remove("admin-open");
  }, [open]);

  const merge = useCallback((incoming: ActivityEvent[]) => {
    if (!incoming.length) return;
    const el = list.current;
    keep.current = el ? { top: el.scrollTop, height: el.scrollHeight } : null;
    setEvents((prev) => {
      const known = new Set(prev.map((e) => e.id));
      const fresh = incoming.filter((e) => !known.has(e.id));
      return fresh.length ? [...fresh.reverse(), ...prev].slice(0, KEEP) : prev;
    });
  }, []);

  // Poll while the drawer is open. Nothing runs while it's closed.
  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      if (stopped) return;
      if (!document.hidden || lastId.current === null) {
        try {
          const res = await fetch(lastId.current === null ? "/api/admin/activity" : `/api/admin/activity?after=${lastId.current}`, { cache: "no-store" });
          if (!res.ok) throw new Error();
          const body = (await res.json()) as { events: ActivityEvent[]; latest: number; bugsOpen?: number; reportsOpen?: number };
          if (stopped) return;
          lastId.current = Math.max(lastId.current ?? 0, body.latest);
          setBugsOpen(body.bugsOpen ?? 0);
          setReportsOpen(body.reportsOpen ?? 0);
          idle.current = body.events.length ? 0 : idle.current + 1;
          merge(body.events);
          setLoaded(true);
          setFailed(false);
        } catch {
          if (!stopped) setFailed(true);
        }
      }
      timer = setTimeout(tick, idle.current < 10 ? 3000 : 6000);
    }
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [open, merge]);

  // When rows are added above the reader, keep what they're looking at in place.
  useLayoutEffect(() => {
    const el = list.current;
    const k = keep.current;
    if (el && k && k.top > 40) el.scrollTop = k.top + (el.scrollHeight - k.height);
    keep.current = null;
  }, [events]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [open]);

  const shown = useMemo(() => {
    const types = FILTERS.find((f) => f.key === filter)?.types ?? null;
    const q = query.trim().toLowerCase();
    return events.filter((e) => (!types || types.includes(e.type)) && (!q || e.user.toLowerCase().includes(q) || e.text.toLowerCase().includes(q)));
  }, [events, filter, query]);

  return (
    <>
      <button className={`admin-tab ${open ? "open" : ""}`} aria-label={open ? "Close admin panel" : "Open admin panel"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>Admin {open ? "‹" : "›"}</span>
      </button>

      <aside className={`admin-panel ${open ? "open" : ""}`} aria-label="Admin activity log" aria-hidden={!open} inert={!open}>
        <div className="admin-views" role="tablist" aria-label="Admin sections">
          <button role="tab" aria-selected={view === "activity"} className={view === "activity" ? "on" : ""} onClick={() => view !== "activity" && swap("view", () => setView("activity"))}>
            Activity
          </button>
          <button role="tab" aria-selected={view === "bugs"} className={view === "bugs" ? "on" : ""} onClick={() => view !== "bugs" && swap("view", () => setView("bugs"))}>
            Bugs{bugsOpen > 0 && <span className="admin-badge">{bugsOpen}</span>}
          </button>
          <button role="tab" aria-selected={view === "reports"} className={view === "reports" ? "on" : ""} onClick={() => view !== "reports" && swap("view", () => setView("reports"))}>
            Reports{reportsOpen > 0 && <span className="admin-badge">{reportsOpen}</span>}
          </button>
        </div>

        <div className={`admin-view-wrap${swapping === "view" ? " leaving" : ""}`}>
        <div className="admin-view" key={view}>
        {view === "bugs" ? (
          <AdminBugs onOpenPlayer={onOpenPlayer} />
        ) : view === "reports" ? (
          <AdminReports onOpenPlayer={onOpenPlayer} />
        ) : (
          <>
        <div className="admin-filters" role="group" aria-label="Filter activity">
          {FILTERS.map((f) => (
            <button key={f.key} aria-pressed={filter === f.key} className={filter === f.key ? "on" : ""} onClick={() =>
                filter !== f.key &&
                swap("list", () => {
                  setFilter(f.key);
                  if (list.current) list.current.scrollTop = 0;
                })
              }
            >
              {f.label}
            </button>
          ))}
          <button className="link admin-clear" onClick={() => setEvents([])}>
            Clear view
          </button>
        </div>
        <input className="admin-search" type="search" placeholder="Filter by player or text" aria-label="Filter activity" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />

        <div className={`admin-list${swapping === "list" ? " leaving" : ""}`} ref={list}>
         <div className="list-in" key={filter}>
          {!loaded && !failed && <p className="muted small admin-empty">Loading…</p>}
          {failed && <p className="muted small admin-empty">Couldn&apos;t load the log. {loaded ? "Retrying…" : "Are you signed in as an admin?"}</p>}
          {loaded && shown.length === 0 && <p className="muted small admin-empty">{events.length ? "Nothing matches that filter." : "No activity yet."}</p>}
          {shown.map((e) => (
            <div key={e.id} className={`admin-row t-${e.type}`}>
              <span className="admin-time">{stamp(e.at, now)}</span>
              <span className="admin-type">{LABEL[e.type]}</span>
              <div className="admin-what">
                {e.user && !e.user.startsWith("(") ? (
                  <>
                    <button className="admin-user" onClick={() => onOpenPlayer(e.user)}>
                      {e.user}
                    </button>
                    <AdminTag username={e.user} />
                  </>
                ) : (
                  <b>{e.user || "system"}</b>
                )}{" "}
                {e.text}
              </div>
            </div>
          ))}
         </div>
        </div>
        <footer className="admin-foot muted small">
          {events.length > 0 ? `${shown.length} of ${events.length} shown · ` : ""}the newest few thousand actions are kept
        </footer>
          </>
        )}
        </div>
        </div>

        <AdjustPoints me={me} onChange={onMeChange} />
      </aside>
    </>
  );
}
