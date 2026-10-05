"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { AdminTag } from "./AdminTag";
import { Avatar, SchoolLogo } from "./Avatar";

/** "Find a player": type a username, tap a result to open their profile. Open to everyone. */
export function UserSearch({ onOpenPlayer }: { onOpenPlayer: (username: string) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits(null);
      setError("");
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/users?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then(async (r) => {
          const b = await r.json();
          if (!r.ok) throw new Error(b.error ?? "Search failed.");
          setHits(b.profiles);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message || "Search failed.");
        });
    }, 220);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]);

  return (
    <div className="user-search">
      <input
        type="search"
        placeholder="Find a player by username"
        aria-label="Find a player by username"
        value={query}
        maxLength={30}
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits?.[0]) onOpenPlayer(hits[0].username);
          else if (e.key === "Escape" && query) {
            e.stopPropagation(); // clear the box instead of closing the dialog
            setQuery("");
          }
        }}
      />
      {error && <p className="muted small">{error}</p>}
      {hits && hits.length === 0 && !error && <p className="muted small">No players found.</p>}
      {hits && hits.length > 0 && (
        <ul className="user-hits">
          {hits.map((p) => (
            <li key={p.username}>
              <button onClick={() => onOpenPlayer(p.username)}>
                <Avatar name={p.username} src={p.avatar} size={30} />
                <span className="lb-name">
                  {p.username}
                  <AdminTag username={p.username} />
                </span>
                {p.school && <SchoolLogo school={p.school} size={20} />}
                <span className="lb-score">{p.points.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
