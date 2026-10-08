"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { CHAT_REACTIONS, type ChatMessage, type ChatReaction, type ChatReactions, type Profile } from "@/lib/types";
import { AdminTag } from "./AdminTag";
import { Avatar } from "./Avatar";
import { AddReactionIcon, REACTION_LABEL, ReactionIcon } from "./ReactionIcons";
import { bunchesWith } from "@/lib/chatGroup";

const MAX = 280;
const KEEP = 200;
const MENTION_POLL_MS = 45_000;

const readKey = (u: string) => `quantdle-chat-read:${u.toLowerCase()}`;
const getRead = (u: string) => {
  try {
    return localStorage.getItem(readKey(u));
  } catch {
    return null;
  }
};
const setRead = (u: string, id: number) => {
  try {
    localStorage.setItem(readKey(u), String(id));
  } catch {}
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Your reaction added (or taken back) on a reactions map, without touching the original. */
function toggled(r: ChatReactions | undefined, kind: ChatReaction, me: string): ChatReactions {
  const next: ChatReactions = { ...r };
  const who = next[kind] ?? [];
  const had = who.some((u) => u.toLowerCase() === me.toLowerCase());
  const after = had ? who.filter((u) => u.toLowerCase() !== me.toLowerCase()) : [...who, me];
  if (after.length) next[kind] = after;
  else delete next[kind];
  return next;
}

/** A message's text, with the @mentions that are real players turned into links to their profiles. */
function MessageText({ m, me, onOpen }: { m: ChatMessage; me?: string; onOpen: (u: string) => void }) {
  const names = m.n ?? [];
  if (names.length === 0) return <>{m.t}</>;
  const re = new RegExp(`(^|[^A-Za-z0-9_-])@(${[...names].sort((a, b) => b.length - a.length).map(escapeRe).join("|")})(?![A-Za-z0-9_-])`, "gi");
  const out: React.ReactNode[] = [];
  let last = 0;
  for (let hit = re.exec(m.t); hit; hit = re.exec(m.t)) {
    const at = hit.index + hit[1].length; // where the @ is
    const shown = names.find((n) => n.toLowerCase() === hit[2].toLowerCase()) ?? hit[2];
    out.push(<Fragment key={at}>{m.t.slice(last, at)}</Fragment>);
    out.push(
      <button key={`m${at}`} className={`chat-mention${me && shown.toLowerCase() === me.toLowerCase() ? " me" : ""}`} onClick={() => onOpen(shown)}>
        @{shown}
      </button>,
    );
    last = at + 1 + hit[2].length;
  }
  out.push(<Fragment key="end">{m.t.slice(last)}</Fragment>);
  return <>{out}</>;
}

const MUTES: { label: string; body: { minutes?: number; ban?: boolean } }[] = [
  { label: "10 min", body: { minutes: 10 } },
  { label: "1 hour", body: { minutes: 60 } },
  { label: "1 day", body: { minutes: 1440 } },
  { label: "Ban", body: { ban: true } },
];

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
  const [mentions, setMentions] = useState(0); // messages that @mention you since you last had the chat open
  const [pickerFor, setPickerFor] = useState<number | null>(null); // message whose reaction picker is open
  const [modFor, setModFor] = useState<number | null>(null); // message whose moderation menu is open (admins)
  const [mutedNow, setMutedNow] = useState<Set<string> | null>(null);
  const [token, setToken] = useState<{ q: string; start: number } | null>(null); // the @name being typed
  const [suggestions, setSuggestions] = useState<{ name: string; avatar: string | null }[]>([]);
  const [active, setActive] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null); // a bunched message whose actions are showing (tap, or click)

  const list = useRef<HTMLDivElement>(null);
  const found = useRef(new Map<string, { name: string; avatar: string | null }[]>());
  const input = useRef<HTMLInputElement>(null);
  const lastId = useRef<number | null>(null);
  const stick = useRef(true); // is the list scrolled to the bottom?
  const idle = useRef(0);
  const wake = useRef<() => void>(() => {});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Merge new log entries: add messages, apply delete events, keep order. Returns how many new messages arrived. */
  const apply = useCallback((incoming: ChatMessage[], mine?: string | null) => {
    let added = 0;
    setMessages((prev) => {
      let next = prev;
      const known = new Set(prev.map((m) => m.id));
      for (const m of incoming) {
        if (m.del) next = next.filter((x) => x.id !== m.del);
        else if (m.rx !== undefined) next = next.map((x) => (x.id === m.rx ? { ...x, r: m.r } : x));
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
          if (user && !document.hidden) {
            setRead(user.username, lastId.current);
            setMentions(0);
          }
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

  // While the chat is closed, check now and then whether someone has @mentioned you (a tiny private request).
  useEffect(() => {
    if (!user) return setMentions(0);
    if (open) return;
    const me = user.username;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      if (stopped) return;
      if (!document.hidden) {
        try {
          const seen = getRead(me);
          const res = await fetch(`/api/chat/mentions${seen ? `?after=${seen}` : ""}`, { cache: "no-store" });
          const body = (await res.json()) as { count: number; latest: number };
          if (stopped) return;
          if (seen === null) {
            setRead(me, body.latest); // first time: start with nothing unread
            setMentions(0);
          } else setMentions(body.count);
        } catch {}
      }
      timer = setTimeout(check, MENTION_POLL_MS);
    }
    check();
    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, open]);

  // Suggest players while an @name is being typed (a short pause first, and answers are remembered).
  useEffect(() => {
    if (!token) return setSuggestions([]);
    const q = token.q.toLowerCase();
    const cached = found.current.get(q);
    if (cached) {
      setSuggestions(cached);
      setActive(0);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { profiles: Profile[] };
        const list = body.profiles.slice(0, 5).map((p) => ({ name: p.username, avatar: p.avatar }));
        found.current.set(q, list);
        if (live) {
          setSuggestions(list);
          setActive(0);
        }
      } catch {}
    }, 220);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [token]);

  // Keep the newest message in view unless the reader scrolled up.
  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, open, loaded]);

  useEffect(() => {
    if (open && user && window.innerWidth > 480) input.current?.focus();
  }, [open, user]);

  function onScroll() {
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

  function say(text: string) {
    setNote(text);
    setTimeout(() => setNote((n) => (n === text ? "" : n)), 4000);
  }

  /** Open (or close) the moderation menu for a message, checking whether its author is already muted. */
  async function openMod(m: ChatMessage) {
    if (modFor === m.id) return setModFor(null);
    setModFor(m.id);
    setMutedNow(null);
    try {
      const res = await fetch("/api/chat/mute", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { muted: { username: string }[] };
      setMutedNow(new Set(body.muted.map((x) => x.username.toLowerCase())));
    } catch {}
  }

  async function moderate(username: string, body: { minutes?: number; ban?: boolean; unmute?: boolean }, done: string) {
    const res = await fetch("/api/chat/mute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, ...body }) }).catch(() => null);
    say(res?.ok ? done : "Couldn't do that.");
    setModFor(null);
  }

  /** Give a reaction (or take it back). It shows at once and is corrected by the server's answer. */
  async function react(id: number, kind: ChatReaction) {
    if (!user) return;
    setPickerFor(null);
    const me = user.username;
    setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, r: toggled(x.r, kind, me) } : x)));
    try {
      const res = await fetch("/api/chat/react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind }) });
      const body = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, r: toggled(x.r, kind, me) } : x))); // undo
        return say(body.error ?? "Couldn't react.");
      }
      setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, r: body.r } : x)));
    } catch {
      setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, r: toggled(x.r, kind, me) } : x)));
      say("Network hiccup. Try again.");
    }
  }

  /** Track the @name under the cursor so suggestions can follow what's being typed. */
  function onDraft(value: string, caret: number) {
    setDraft(value);
    const hit = /(?:^|\s)@([A-Za-z0-9_-]{1,20})$/.exec(value.slice(0, caret));
    setToken(hit ? { q: hit[1], start: caret - hit[1].length - 1 } : null);
  }

  function pick(name: string) {
    if (!token) return;
    const before = draft.slice(0, token.start);
    const after = draft.slice(token.start + 1 + token.q.length).replace(/^\s/, "");
    const inserted = `${before}@${name} `;
    setDraft((inserted + after).slice(0, MAX));
    setToken(null);
    setSuggestions([]);
    setTimeout(() => {
      input.current?.focus();
      input.current?.setSelectionRange(inserted.length, inserted.length);
    }, 0);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!token || suggestions.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(suggestions[active].name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setToken(null);
    }
  }

  return (
    <>
      <button className={`chat-fab ${open ? "open" : ""}`} aria-label={open ? "Close chat" : mentions > 0 ? `Open global chat (${mentions} ${mentions === 1 ? "mention" : "mentions"} of you)` : "Open global chat"} aria-expanded={open} onClick={toggle}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          </svg>
        )}
        {mentions > 0 && !open && (
          <span className="chat-badge" aria-hidden>
            {mentions > 9 ? "9+" : mentions}
          </span>
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
            {messages.map((m, i) => {
              const cont = bunchesWith(messages[i - 1], m);
              const mentionsMe = Boolean(user && m.u !== user.username && m.n?.some((n) => n.toLowerCase() === user.username.toLowerCase()));
              const reactions = CHAT_REACTIONS.filter((k) => (m.r?.[k]?.length ?? 0) > 0);
              const mine = (k: ChatReaction) => Boolean(user && m.r?.[k]?.some((u) => u.toLowerCase() === user.username.toLowerCase()));
              return (
                <div
                  key={m.id}
                  className={`chat-msg ${m.u === user?.username ? "me" : ""}${mentionsMe ? " mentions-me" : ""}${cont ? " cont" : ""}${tapped === m.id ? " tapped" : ""}`}
                  onClick={cont ? (e) => !(e.target as HTMLElement).closest("button, a") && setTapped((t) => (t === m.id ? null : m.id)) : undefined}
                >
                  {cont ? <span className="chat-avatar-gap" aria-hidden /> : <Avatar name={m.u} src={m.a} size={26} />}
                  <div className="chat-body">
                    {(!cont || user) && (
                    <div className="chat-meta">
                      <button className="chat-name" onClick={() => onOpenPlayer(m.u)}>
                        {m.u}
                      </button>
                      <AdminTag username={m.u} />
                      <span className="muted">{ago(m.at, now)}</span>
                      {user && (
                        <button className="chat-react add" aria-label="Add a reaction" aria-expanded={pickerFor === m.id} onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}>
                          <AddReactionIcon size={14} />
                        </button>
                      )}
                      {user?.admin && (
                        <span className="chat-mod">
                          {!m.m && (
                            <button title={`Mute or ban ${m.u}`} aria-label={`Moderate ${m.u}`} aria-expanded={modFor === m.id} onClick={() => openMod(m)}>
                              mute
                            </button>
                          )}
                          <button title="Delete message" aria-label="Delete message" onClick={() => remove(m.id)}>
                            delete
                          </button>
                        </span>
                      )}
                    </div>
                    )}
                    <div className="chat-text" title={cont ? new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : undefined}>
                      <MessageText m={m} me={user?.username} onOpen={onOpenPlayer} />
                    </div>

                    {modFor === m.id && (
                      <div className="chat-modmenu" role="group" aria-label={`Moderate ${m.u}`}>
                        {MUTES.map((x) => (
                          <button key={x.label} onClick={() => moderate(m.u, x.body, x.body.ban ? `Banned ${m.u} from chat.` : `Muted ${m.u} for ${x.label}.`)}>
                            {x.label}
                          </button>
                        ))}
                        {mutedNow?.has(m.u.toLowerCase()) && (
                          <button className="good" onClick={() => moderate(m.u, { unmute: true }, `${m.u} can chat again.`)}>
                            Unmute
                          </button>
                        )}
                      </div>
                    )}

                    {(reactions.length > 0 || pickerFor === m.id) && (
                      <div className="chat-reacts">
                        {reactions.map((k) => (
                          <button
                            key={k}
                            className={`chat-react${mine(k) ? " on" : ""}`}
                            disabled={!user}
                            title={`${REACTION_LABEL[k]}: ${m.r![k]!.join(", ")}`}
                            aria-label={`${REACTION_LABEL[k]}, ${m.r![k]!.length}${mine(k) ? ", you reacted" : ""}`}
                            aria-pressed={mine(k)}
                            onClick={() => react(m.id, k)}
                          >
                            <ReactionIcon kind={k} filled={mine(k)} />
                            <span>{m.r![k]!.length}</span>
                          </button>
                        ))}
                        {pickerFor === m.id && (
                          <span className="chat-picker" role="group" aria-label="Pick a reaction">
                            {CHAT_REACTIONS.map((k) => (
                              <button key={k} className={`chat-react${mine(k) ? " on" : ""}`} aria-label={REACTION_LABEL[k]} title={REACTION_LABEL[k]} onClick={() => react(m.id, k)}>
                                <ReactionIcon kind={k} filled={mine(k)} size={17} />
                              </button>
                            ))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
              {token && suggestions.length > 0 && (
                <ul className="chat-suggest" role="listbox" aria-label="Players">
                  {suggestions.map((p, i) => (
                    <li key={p.name} role="option" aria-selected={i === active}>
                      <button
                        type="button"
                        className={i === active ? "on" : ""}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(p.name)}
                      >
                        <Avatar name={p.name} src={p.avatar} size={20} />
                        <span>{p.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="chat-row">
                <input
                  ref={input}
                  value={draft}
                  onChange={(e) => onDraft(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                  onKeyDown={onKey}
                  onBlur={() => setTimeout(() => setToken(null), 120)}
                  maxLength={MAX}
                  placeholder="Say something…"
                  aria-label="Message"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={Boolean(token && suggestions.length > 0)}
                  aria-autocomplete="list"
                />
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
    </>
  );
}
