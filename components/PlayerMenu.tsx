"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isAdmin } from "@/lib/admins";
import { REPORT_REASONS, type Profile, type ReportReason } from "@/lib/types";

export interface MenuTarget {
  username: string;
  /** The chat message that was right-clicked, if any. */
  messageId: number | null;
  x: number;
  y: number;
}

/** From the mute endpoint: false if they can chat, "never" for a ban, when a mute ends (ms), or null for an old mute with no end. */
type Moderation = { until: number | "never" | null | false };

const MUTES = [
  { label: "10m", minutes: 10 },
  { label: "1h", minutes: 60 },
  { label: "1d", minutes: 24 * 60 },
  { label: "1w", minutes: 7 * 24 * 60 },
];

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** The right-click menu on a player's name in the chat: view their profile or report them; admins can also moderate. */
export function PlayerMenu({
  target,
  me,
  onClose,
  onOpenPlayer,
  onSignIn,
  onDone,
  onDelete,
}: {
  target: MenuTarget;
  me: Profile | null;
  onClose: () => void;
  onOpenPlayer: (username: string) => void;
  onSignIn: () => void;
  /** Called with a confirmation to show in the chat once an action worked. */
  onDone: (note: string) => void;
  /** Admins: remove the message the menu was opened on. */
  onDelete: (id: number) => void;
}) {
  const [view, setView] = useState<"menu" | "report" | "points" | "mute">("menu");
  const [mod, setMod] = useState<Moderation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pos, setPos] = useState({ left: target.x, top: target.y });
  const box = useRef<HTMLDivElement>(null);

  const self = me?.username.toLowerCase() === target.username.toLowerCase();
  const admin = !!me?.admin;
  const canModerate = admin && !isAdmin(target.username);

  // Admins: look up whether this player is muted or banned, to offer the right actions.
  useEffect(() => {
    if (!canModerate) return;
    let stale = false;
    fetch(`/api/chat/mute?username=${encodeURIComponent(target.username)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => !stale && b && setMod({ until: b.until }))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [canModerate, target.username]);

  /** Runs an admin action; on success closes the menu and shows `ok` in the chat. */
  async function run(url: string, init: RequestInit, ok: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, init);
      const b = await res.json().catch(() => ({}));
      if (!res.ok) return setError(b.error ?? "That didn't work.");
      onClose();
      onDone(ok);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const banned = mod?.until === "never";
  const muted = mod !== null && mod.until !== false && !banned;

  // Keep the menu on screen: flip it left/up when it would spill over an edge.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    const left = target.x + width + pad > window.innerWidth ? Math.max(pad, target.x - width) : target.x;
    const top = target.y + height + pad > window.innerHeight ? Math.max(pad, window.innerHeight - height - pad) : target.y;
    setPos({ left, top });
  }, [target, view]);

  // Close on a click elsewhere, Escape, or the window changing size.
  useEffect(() => {
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button, input")?.focus();
  }, [view]);

  function report() {
    if (!me) {
      onClose();
      return onSignIn();
    }
    setView("report");
  }

  return (
    <div className="player-menu" ref={box} role="menu" aria-label={`Actions for ${target.username}`} style={pos} onContextMenu={(e) => e.preventDefault()}>
      <div className="player-menu-head">{target.username}</div>
      {view === "menu" && (
        <>
          <button
            role="menuitem"
            onClick={() => {
              onClose();
              onOpenPlayer(target.username);
            }}
          >
            View profile
          </button>
          {!self && (
            <button role="menuitem" className="danger" onClick={report}>
              Report…
            </button>
          )}
          {admin && (
            <>
              <div className="player-menu-sep">Admin</div>
              <button role="menuitem" onClick={() => setView("points")}>
                Edit points…
              </button>
              {canModerate && (
                <>
                  {muted ? (
                    <button role="menuitem" disabled={busy} onClick={() => run("/api/chat/mute", json("POST", { username: target.username, unmute: true }), `Unmuted ${target.username}.`)}>
                      Unmute{typeof mod.until === "number" && mod.until > Date.now() ? ` (${left(mod.until)} left)` : ""}
                    </button>
                  ) : (
                    !banned && (
                      <button role="menuitem" onClick={() => setView("mute")}>
                        Mute…
                      </button>
                    )
                  )}
                  {banned ? (
                    <button role="menuitem" disabled={busy} onClick={() => run("/api/chat/mute", json("POST", { username: target.username, unmute: true }), `Unbanned ${target.username} from the chat.`)}>
                      Unban from chat
                    </button>
                  ) : (
                    <button role="menuitem" className="danger" disabled={busy || !mod} onClick={() => run("/api/chat/mute", json("POST", { username: target.username, ban: true }), `Banned ${target.username} from the chat.`)}>
                      Ban from chat
                    </button>
                  )}
                </>
              )}
              {target.messageId !== null && (
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    onClose();
                    onDelete(target.messageId!);
                  }}
                >
                  Delete message
                </button>
              )}
              {error && <p className="chat-error">{error}</p>}
            </>
          )}
        </>
      )}
      {view === "mute" && (
        <div className="player-menu-form">
          <span className="muted small">Mute {target.username} for…</span>
          <div className="player-menu-chips">
            {MUTES.map((m) => (
              <button key={m.label} type="button" disabled={busy} onClick={() => run("/api/chat/mute", json("POST", { username: target.username, minutes: m.minutes }), `Muted ${target.username} for ${m.label}.`)}>
                {m.label}
              </button>
            ))}
          </div>
          {error && <p className="chat-error">{error}</p>}
          <div className="player-menu-row">
            <button type="button" className="link" onClick={() => setView("menu")}>
              ← Back
            </button>
          </div>
        </div>
      )}
      {view === "points" && <PointsForm target={target} busy={busy} error={error} onBack={() => setView("menu")} onApply={(points, reason) => run("/api/admin/points", json("POST", { username: target.username, points, reason }), `Adjusted ${target.username}'s points by ${points > 0 ? "+" : ""}${points}.`)} />}
      {view === "report" && <ReportForm target={target} onBack={() => setView("menu")} onDone={(n) => (onClose(), onDone(n))} />}
    </div>
  );
}

function left(until: number) {
  const m = Math.ceil((until - Date.now()) / 60_000);
  return m < 60 ? `${m}m` : m < 48 * 60 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

function PointsForm({
  target,
  busy,
  error,
  onBack,
  onApply,
}: {
  target: MenuTarget;
  busy: boolean;
  error: string;
  onBack: () => void;
  onApply: (points: number, reason: string) => void;
}) {
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const valid = /^-?\d+$/.test(points.trim()) && Number(points) !== 0;

  return (
    <form
      className="player-menu-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onApply(Number(points), reason.trim());
      }}
    >
      <span className="muted small">Add points to {target.username} (negative to remove)</span>
      <input value={points} onChange={(e) => setPoints(e.target.value)} inputMode="numeric" placeholder="e.g. 50 or -50" autoComplete="off" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Reason (saved in the log)" autoComplete="off" />
      {error && <p className="chat-error">{error}</p>}
      <div className="player-menu-row">
        <button type="button" className="link" onClick={onBack}>
          ← Back
        </button>
        <button className="btn primary" disabled={busy || !valid}>
          {busy ? "…" : "Apply"}
        </button>
      </div>
    </form>
  );
}

function ReportForm({ target, onBack, onDone }: { target: MenuTarget; onBack: () => void; onDone: (note: string) => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target.username, reason, details: details.trim(), messageId: target.messageId }),
      });
      const b = await res.json();
      if (!res.ok) return setError(b.error ?? "Couldn't send the report.");
      onDone(`Thanks, an admin will look at your report about ${target.username}.`);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="player-menu-form"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <span className="muted small">{target.messageId ? "Report this message for…" : "Report this player for…"}</span>
      <div className="player-menu-chips">
        {REPORT_REASONS.map((r) => (
          <button key={r} type="button" className={reason === r ? "on" : ""} aria-pressed={reason === r} onClick={() => setReason(r)}>
            {r}
          </button>
        ))}
      </div>
      <input value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} placeholder={reason === "Other" ? "What happened?" : "Anything else? (optional)"} autoComplete="off" />
      {error && <p className="chat-error">{error}</p>}
      <div className="player-menu-row">
        <button type="button" className="link" onClick={onBack}>
          ← Back
        </button>
        <button className="btn primary" disabled={busy || !reason || (reason === "Other" && details.trim().length < 5)}>
          {busy ? "…" : "Send report"}
        </button>
      </div>
    </form>
  );
}
