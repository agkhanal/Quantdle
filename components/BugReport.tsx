"use client";

import { useEffect, useRef, useState } from "react";
import { BUG_CATEGORIES, type BugCategory, type BugReport as Report, type Profile } from "@/lib/types";
import Modal from "./Modal";

const STATUS_LABEL = { open: "Open", resolved: "Resolved", dismissed: "Closed" } as const;

function when(at: number) {
  const d = new Date(at);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** A small button next to the chat button; opens a popup to report a bug and to see how your reports are going. */
export function BugReport({
  user,
  context,
  updates,
  onSignIn,
  onSeen,
}: {
  user: Profile | null;
  /** What the player was doing, e.g. "Daily · Puzzle · HH vs HT" */
  context: string;
  /** Number of your reports an admin has handled since you last looked */
  updates: number;
  onSignIn: () => void;
  onSeen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "mine">("new");
  const [category, setCategory] = useState<BugCategory>("Gameplay");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tech, setTech] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Report | null>(null);
  const [mine, setMine] = useState<Report[] | null>(null);
  const seen = useRef(onSeen); // (kept in a ref so a new function each render doesn't refetch)
  seen.current = onSeen;

  // Updates waiting? Open straight to the list.
  function openPopup() {
    setOpen(true);
    setSent(null);
    setError("");
    setTab(updates > 0 ? "mine" : "new");
  }

  useEffect(() => {
    if (!open || tab !== "mine" || !user) return;
    let live = true;
    fetch("/api/bugs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => {
        if (!live) return;
        setMine(b.reports);
        seen.current();
      })
      .catch(() => live && setMine([]));
    return () => {
      live = false;
    };
  }, [open, tab, user]);

  const techPreview = () => ({ path: location.pathname, viewport: `${innerWidth}x${innerHeight}`, ua: navigator.userAgent, game: context });

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, body, tech: tech ? techPreview() : undefined }),
      });
      const b = await res.json();
      if (!res.ok) return setError(b.error ?? "Couldn't send that.");
      setSent(b.report);
      setTitle("");
      setBody("");
      setMine(null);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="bug-fab" aria-label={updates > 0 ? "Report a bug (you have updates)" : "Report a bug"} title="Report a bug" onClick={openPopup}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
          <rect x="7" y="7.5" width="10" height="12" rx="5" />
          <path d="M12 11.5v8M7 12H3M17 12h4M7.5 17 4 19M16.5 17l3.5 2M8 7.5 5.5 5M16 7.5 18.5 5" />
        </svg>
        {updates > 0 && <span className="bug-dot" aria-hidden />}
      </button>

      {open && (
        <Modal title="Report a bug" onClose={() => setOpen(false)}>
          {!user ? (
            <div className="bug-form">
              <p className="muted">Sign in to report a bug. If we fix it, you can earn points.</p>
              <button
                className="btn primary wide"
                onClick={() => {
                  setOpen(false);
                  onSignIn();
                }}
              >
                Sign in
              </button>
            </div>
          ) : (
            <>
              <div className="modes small-tabs" role="tablist">
                <button role="tab" aria-selected={tab === "new"} className={tab === "new" ? "on" : ""} onClick={() => setTab("new")}>
                  New report
                </button>
                <button role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>
                  My reports{updates > 0 ? ` (${updates} new)` : ""}
                </button>
              </div>

              {tab === "new" && sent && (
                <div className="bug-form bug-thanks">
                  <p>
                    <b>Thanks! Report #{sent.id} is in.</b>
                  </p>
                  <p className="muted small">An admin will take a look. If it's resolved you'll see a notice here, and helpful reports can earn points.</p>
                  <button className="btn wide" onClick={() => setSent(null)}>
                    Report another
                  </button>
                </div>
              )}

              {tab === "new" && !sent && (
                <form
                  className="bug-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <div className="field">
                    <span>What kind of problem?</span>
                    <div className="bug-cats">
                      {BUG_CATEGORIES.map((c) => (
                        <button key={c} type="button" className={category === c ? "on" : ""} onClick={() => setCategory(c)}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="field">
                    <span>Short title (optional)</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="e.g. Logo overlaps the buttons" autoComplete="off" />
                  </label>
                  <label className="field">
                    <span>What happened?</span>
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} rows={5} placeholder="What did you do, what did you expect, and what happened instead?" />
                  </label>
                  <label className="bug-check">
                    <input type="checkbox" checked={tech} onChange={(e) => setTech(e.target.checked)} />
                    <span>
                      Include technical details: the page, your screen size, your browser, and what you were playing. <span className="muted">(Helps us reproduce it.)</span>
                    </span>
                  </label>
                  {error && <p className="quote-note bad">{error}</p>}
                  <button className="btn primary wide" disabled={busy || body.trim().length < 10}>
                    {busy ? "…" : "Send report"}
                  </button>
                  <p className="muted small">Only you and the admins can see your report.</p>
                </form>
              )}

              {tab === "mine" && (
                <div className="bug-mine">
                  {mine === null && <p className="muted small">Loading…</p>}
                  {mine && mine.length === 0 && <p className="muted small">You haven&apos;t reported anything yet.</p>}
                  {mine?.map((r) => (
                    <div key={r.id} className={`bug-card st-${r.status}`}>
                      <div className="bug-card-head">
                        <b>#{r.id}</b>
                        <span className="muted small">
                          {r.category} · {when(r.at)}
                        </span>
                        <span className={`bug-pill st-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                      </div>
                      <div className="bug-card-title">{r.title || r.body.slice(0, 90)}</div>
                      {r.note && <p className="bug-note">&ldquo;{r.note}&rdquo;</p>}
                      {r.points ? <p className="bug-points">+{r.points} points for this report. Thank you!</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}
