"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ActivityEvent, ActivityType } from "@/lib/types";

const KEEP = 500;
const STORE_KEY = "quantdle-admin-open";

const FILTERS: { key: string; label: string; types: ActivityType[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "games", label: "Games", types: ["guess", "hint", "win", "loss", "egg"] },
  { key: "profile", label: "Profile", types: ["profile"] },
  { key: "accounts", label: "Accounts", types: ["account"] },
  { key: "chat", label: "Chat", types: ["chat"] },
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
};

function stamp(at: number, now: number) {
  const d = new Date(at);
  const time = d.toLocaleTimeString([], { hour12: false });
  return now - at > 12 * 3600_000 ? `${d.getMonth() + 1}/${d.getDate()} ${time}` : time;
}

/** Admin-only activity log in a left-hand drawer. Opening it pushes the page to the right. */
export function AdminPanel({ onOpenPlayer }: { onOpenPlayer: (username: string) => void }) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(true);
  const [events, setEvents] = useState<ActivityEvent[]>([]); // newest first
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

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

  // Poll while the drawer is open and live. Nothing runs while it's closed.
  useEffect(() => {
    if (!open || !live) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      if (stopped) return;
      if (!document.hidden || lastId.current === null) {
        try {
          const res = await fetch(lastId.current === null ? "/api/admin/activity" : `/api/admin/activity?after=${lastId.current}`, { cache: "no-store" });
          if (!res.ok) throw new Error();
          const body = (await res.json()) as { events: ActivityEvent[]; latest: number };
          if (stopped) return;
          lastId.current = Math.max(lastId.current ?? 0, body.latest);
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
  }, [open, live, merge]);

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
        <header className="admin-head">
          <b>Activity log</b>
          <span className={`admin-live ${live ? "on" : ""}`} aria-hidden />
          <button className="link" onClick={() => setLive((l) => !l)}>
            {live ? "Pause" : "Resume"}
          </button>
          <button
            className="link"
            onClick={() => {
              setEvents([]);
            }}
          >
            Clear view
          </button>
        </header>

        <div className="admin-filters" role="tablist" aria-label="Filter activity">
          {FILTERS.map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? "on" : ""} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <input className="admin-search" type="search" placeholder="Filter by player or text" aria-label="Filter activity" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />

        <div className="admin-list" ref={list}>
          {!loaded && !failed && <p className="muted small admin-empty">Loading…</p>}
          {failed && <p className="muted small admin-empty">Couldn&apos;t load the log. {loaded ? "Retrying…" : "Are you signed in as an admin?"}</p>}
          {loaded && shown.length === 0 && <p className="muted small admin-empty">{events.length ? "Nothing matches that filter." : "No activity yet."}</p>}
          {shown.map((e) => (
            <div key={e.id} className={`admin-row t-${e.type}`}>
              <span className="admin-time">{stamp(e.at, now)}</span>
              <span className="admin-type">{LABEL[e.type]}</span>
              <div className="admin-what">
                {e.user && !e.user.startsWith("(") ? (
                  <button className="admin-user" onClick={() => onOpenPlayer(e.user)}>
                    {e.user}
                  </button>
                ) : (
                  <b>{e.user || "system"}</b>
                )}{" "}
                {e.text}
              </div>
            </div>
          ))}
        </div>
        <footer className="admin-foot muted small">
          {events.length > 0 ? `${shown.length} of ${events.length} shown · ` : ""}the newest few thousand actions are kept
        </footer>
      </aside>
    </>
  );
}
