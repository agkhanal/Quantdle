"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";

const MAX = 280;

/**
 * The message box, with @name suggestions. It owns what's being typed, so a keystroke re-renders only this box,
 * never the message list above it. `onSend` resolves to an error message, or null once the message is on its way.
 */
export function ChatComposer({
  user,
  open,
  onSignIn,
  onSend,
}: {
  user: Profile | null;
  open: boolean;
  onSignIn: () => void;
  onSend: (text: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState<{ q: string; start: number } | null>(null); // the @name being typed
  const [suggestions, setSuggestions] = useState<{ name: string; avatar: string | null }[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const found = useRef(new Map<string, { name: string; avatar: string | null }[]>());

  useEffect(() => {
    if (open && user && window.innerWidth > 480) input.current?.focus();
  }, [open, user]);

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

  /** The box clears at once and the message appears in the list straight away; if it fails, your text comes back. */
  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setToken(null);
    setError("");
    input.current?.focus();
    onSend(text).then((problem) => {
      if (!problem) return;
      setError(problem);
      setDraft((d) => d || text);
    });
  }

  if (!user) {
    return (
      <div className="chat-form">
        <button className="btn primary wide" onClick={onSignIn}>
          Sign in to chat
        </button>
      </div>
    );
  }

  return (
    <form
      className="chat-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
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
        <button className="btn primary" disabled={!draft.trim()}>
          Send
        </button>
      </div>
      {draft.length > MAX - 60 && <span className="muted small chat-count">{MAX - draft.length} left</span>}
    </form>
  );
}
