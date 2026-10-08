"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { REPORT_REASONS, type Profile, type ReportReason } from "@/lib/types";

export interface MenuTarget {
  username: string;
  /** The chat message that was right-clicked, if any. */
  messageId: number | null;
  x: number;
  y: number;
}

/** The right-click menu on a player's name in the chat: view their profile or report them. */
export function PlayerMenu({
  target,
  me,
  onClose,
  onOpenPlayer,
  onSignIn,
  onDone,
}: {
  target: MenuTarget;
  me: Profile | null;
  onClose: () => void;
  onOpenPlayer: (username: string) => void;
  onSignIn: () => void;
  /** Called with a confirmation to show in the chat once an action worked. */
  onDone: (note: string) => void;
}) {
  const [view, setView] = useState<"menu" | "report">("menu");
  const [pos, setPos] = useState({ left: target.x, top: target.y });
  const box = useRef<HTMLDivElement>(null);

  const self = me?.username.toLowerCase() === target.username.toLowerCase();

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
        </>
      )}
      {view === "report" && <ReportForm target={target} onBack={() => setView("menu")} onDone={(n) => (onClose(), onDone(n))} />}
    </div>
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
