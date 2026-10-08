"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import type { ChatMessage, Profile } from "@/lib/types";
import { AdminTag } from "./AdminTag";
import { Avatar } from "./Avatar";
import { PlayerMenu, type MenuTarget } from "./PlayerMenu";

const MAX = 280;
const KEEP = 200;

function ago(at: number, now: number) {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 45) return "now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86_400)}d`;
}

/** A floating global chat, bottom right. Everyone can read; signed-in players can write. */
export function Chat({
  user,
  onSignIn,
  onOpenPlayer,
}: {
  user: Profile | null;
  onSignIn: () => void;
  onOpenPlayer: (username: string) => void;
}) {
  const [open, setOpen] = useState(false); // wanted open (drives polling)
  const [shown, setShown] = useState(false); // panel is mounted (stays a moment after closing, for the exit animation)
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [unseen, setUnseen] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [menu, setMenu] = useState<MenuTarget | null>(null);

  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastId = useRef<number | null>(null);
  const stick = useRef(true); // is the list scrolled to the bottom?
  const idle = useRef(0);
  const wake = useRef<() => void>(() => {});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean }>({ timer: null, fired: false });
  const closeMenu = useCallback(() => setMenu(null), []);

  /** Merge new log entries: add messages, apply delete and clear events, keep order. Returns how many new messages arrived. */
  const apply = useCallback((incoming: ChatMessage[], mine?: string | null) => {
    let added = 0;
    setMessages((prev) => {
      let next = prev;
      const known = new Set(prev.map((m) => m.id));
      for (const m of incoming) {
        if (m.clr) next = next.filter((x) => x.id > m.id);
        else if (m.del) next = next.filter((x) => x.id !== m.del);
        else if (!known.has(m.id)) {
          next = [...next, m];
          known.add(m.id);
          if (m.u !== mine) added++;
        }
      }
      if (next === prev) return prev;
      return next.sort((a, b) => a.id - b.id).slice(-KEEP);
    });
    if (added && !stick.current) setUnseen((n) => n + added);
  }, []);

  // Poll while the panel is open (and the tab is visible). Nothing runs while it's closed.
  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      if (stopped) return;
      if (!document.hidden || lastId.current === null) {
        try {
          const url = lastId.current === null ? "/api/chat" : `/api/chat?after=${lastId.current}`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error();
          const body = (await res.json()) as { messages: ChatMessage[]; latest: number };
          if (stopped) return;
          lastId.current = Math.max(lastId.current ?? 0, body.latest);
          idle.current = body.messages.length ? 0 : idle.current + 1;
          apply(body.messages, user?.username);
          setLoaded(true);
          setFailed(false);
        } catch {
          if (!stopped) setFailed(true);
        }
      }
      // Quiet rooms are polled less often.
      const delay = idle.current < 10 ? 3000 : idle.current < 30 ? 6000 : 10_000;
      timer = setTimeout(tick, delay);
    }

    wake.current = () => {
      clearTimeout(timer);
      idle.current = 0;
      tick();
    };
    tick();
    const onVisible = () => !document.hidden && wake.current();
    document.addEventListener("visibilitychange", onVisible);
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open, apply, user?.username]);

  // Keep the newest message in view unless the reader scrolled up.
  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, open, loaded]);

  useEffect(() => {
    if (open && user && window.innerWidth > 480) input.current?.focus();
  }, [open, user]);

  /** Right-click (or a long press on touch screens) on a name opens the player menu. */
  function nameHandlers(m: ChatMessage) {
    const openAt = (x: number, y: number) => setMenu({ username: m.u, messageId: m.id, x, y });
    const cancel = () => press.current.timer && clearTimeout(press.current.timer);
    return {
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault();
        openAt(e.clientX, e.clientY);
      },
      onTouchStart: (e: TouchEvent) => {
        const t = e.touches[0];
        press.current.fired = false;
        cancel();
        press.current.timer = setTimeout(() => {
          press.current.fired = true;
          openAt(t.clientX, t.clientY);
        }, 500);
      },
      onTouchMove: cancel,
      onTouchEnd: cancel,
      onClick: () => {
        if (press.current.fired) return void (press.current.fired = false); // the long press already opened the menu
        onOpenPlayer(m.u);
      },
    };
  }

  function onScroll() {
    setMenu(null);
    const el = list.current!;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (stick.current) setUnseen(0);
  }

  function jumpToLatest() {
    const el = list.current!;
    el.scrollTop = el.scrollHeight;
    stick.current = true;
    setUnseen(0);
  }

  function toggle() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (open) {
      setOpen(false);
      setMenu(null);
      setClosing(true);
      closeTimer.current = setTimeout(() => {
        setShown(false);
        setClosing(false);
      }, 200); // matches the chat-out animation
    } else {
      setOpen(true);
      setShown(true);
      setClosing(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "Couldn't send that.");
      stick.current = true;
      apply([body.message], user?.username);
      setDraft("");
      if (body.info) flash(body.info);
      wake.current();
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  async function remove(id: number) {
    const res = await fetch(`/api/chat?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) apply([{ id: -1, u: "", a: null, m: false, t: "", at: 0, del: id }]);
  }

  function flash(text: string) {
    setNote(text);
    setTimeout(() => setNote((n) => (n === text ? "" : n)), 4000);
  }

  return (
    <>
      <button className={`chat-fab ${open ? "open" : ""}`} aria-label={open ? "Close chat" : "Open global chat"} aria-expanded={open} onClick={toggle}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          </svg>
        )}
      </button>

      {shown && (
        <section className={`chat-panel${closing ? " closing" : ""}`} role="dialog" aria-label="Global chat">
          <header className="chat-head">
            <div>
              <b>Global chat</b>
              <span className="muted small"> · be kind, messages are public</span>
            </div>
          </header>

          <div className="chat-list" ref={list} onScroll={onScroll} aria-live="polite">
            {!loaded && !failed && <p className="muted small chat-empty">Loading…</p>}
            {failed && !loaded && <p className="muted small chat-empty">Couldn&apos;t reach the chat. Retrying…</p>}
            {loaded && messages.length === 0 && <p className="muted small chat-empty">No messages yet. Say hi!</p>}
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.u === user?.username ? "me" : ""}`}>
                <Avatar name={m.u} src={m.a} size={26} />
                <div className="chat-body">
                  <div className="chat-meta">
                    <button className="chat-name" title="Right-click for more" {...nameHandlers(m)}>
                      {m.u}
                    </button>
                    <AdminTag username={m.u} />
                    <span className="muted">{ago(m.at, now)}</span>
                    {user?.admin && (
                      <span className="chat-mod">
                        <button title="Delete message" aria-label="Delete message" onClick={() => remove(m.id)}>
                          delete
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="chat-text">{m.t}</div>
                </div>
              </div>
            ))}
          </div>

          {unseen > 0 && (
            <button className="chat-new" onClick={jumpToLatest}>
              ↓ {unseen} new {unseen === 1 ? "message" : "messages"}
            </button>
          )}

          {note && <p className="muted small chat-note">{note}</p>}

          {user ? (
            <form
              className="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              {error && <p className="chat-error">{error}</p>}
              <div className="chat-row">
                <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MAX} placeholder={user.admin ? "Say something… (/clear to wipe the chat)" : "Say something…"} aria-label="Message" autoComplete="off" />
                <button className="btn primary" disabled={sending || !draft.trim()}>
                  Send
                </button>
              </div>
              {draft.length > MAX - 60 && <span className="muted small chat-count">{MAX - draft.length} left</span>}
            </form>
          ) : (
            <div className="chat-form">
              <button className="btn primary wide" onClick={onSignIn}>
                Sign in to chat
              </button>
            </div>
          )}
        </section>
      )}

      {menu && <PlayerMenu target={menu} me={user} onClose={closeMenu} onOpenPlayer={onOpenPlayer} onSignIn={onSignIn} onDone={flash} onDelete={remove} />}
    </>
  );
}
