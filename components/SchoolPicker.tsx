"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { School } from "@/lib/types";
import { SchoolLogo } from "./Avatar";

/** Type-ahead school search (there are ~10,000 schools, so no giant dropdown). */
export function SchoolPicker({ value, onChange }: { value: School | null; onChange: (s: School | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const focusOnOpen = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/schools?q=${encodeURIComponent(query)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((b) => {
          setResults(b.schools ?? []);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // After "Change", the search box appears; put the cursor in it.
  useEffect(() => {
    if (open && focusOnOpen.current) {
      focusOnOpen.current = false;
      input.current?.focus();
    }
  }, [open, value]);

  function pick(s: School) {
    onChange(s);
    setQuery("");
    setOpen(false);
  }

  if (value && !open) {
    return (
      <div className="school-selected">
        <SchoolLogo school={value} size={32} />
        <span className="school-name">{value.name}</span>
        <button
          type="button"
          className="link"
          onClick={() => {
            focusOnOpen.current = true;
            setOpen(true);
          }}
        >
          Change
        </button>
        <button type="button" className="link" onClick={() => onChange(null)}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="school-picker" ref={box}>
      <input
        ref={input}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search your school, e.g. MIT or Purdue"
        value={query}
        autoComplete="off"
        maxLength={80}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {open && query.trim().length >= 2 && (
        <ul className="school-results" id={listId} role="listbox">
          {results.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active} className={i === active ? "on" : ""} onMouseEnter={() => setActive(i)} onMouseDown={(e) => (e.preventDefault(), pick(s))}>
              <SchoolLogo school={s} size={26} />
              <span className="school-name">{s.name}</span>
              <span className="muted small">{s.country}</span>
            </li>
          ))}
          {results.length === 0 && <li className="muted small school-empty">{loading ? "Searching…" : "No schools found. Try a different spelling."}</li>}
        </ul>
      )}
    </div>
  );
}
