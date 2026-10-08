"use client";

import { useCallback, useEffect, useState } from "react";
import type { BugReport, BugStatus } from "@/lib/types";
import { AdminTag } from "./AdminTag";
import { useSwap } from "./useSwap";

const FILTERS: { key: BugStatus | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Closed" },
  { key: "all", label: "All" },
];

const QUICK_POINTS = [10, 25, 50, 100];

function when(at: number) {
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

/** Bug reports inside the admin drawer: a list, and a detail view to resolve, dismiss or reopen (with optional points). */
export function AdminBugs({ onOpenPlayer }: { onOpenPlayer: (username: string) => void }) {
  const [filter, setFilter] = useState<BugStatus | "all">("open");
  const [reports, setReports] = useState<BugReport[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [swapping, swap] = useSwap();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bugs?status=${filter}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setReports((await res.json()).reports);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [filter]);

  useEffect(() => {
    setReports(null);
    refresh();
    const t = setInterval(() => !document.hidden && refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const current = reports?.find((r) => r.id === openId) ?? null;

  const showingDetail = openId !== null && current !== null;

  return (
    <div className={`admin-view-wrap${swapping === "view" ? " leaving" : ""}`}>
      <div className="admin-view" key={showingDetail ? "detail" : "list"}>
        {showingDetail ? (
          <BugDetail
            report={current}
            onBack={() => swap("view", () => setOpenId(null))}
            onOpenPlayer={onOpenPlayer}
            onUpdated={(r) => setReports((rs) => rs && rs.map((x) => (x.id === r.id ? r : x)))}
          />
        ) : (
          <>
      <div className="admin-filters" role="tablist" aria-label="Filter bug reports">
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? "on" : ""} onClick={() => filter !== f.key && swap("list", () => setFilter(f.key))}>
            {f.label}
          </button>
        ))}
      </div>
      <div className={`admin-list${swapping === "list" ? " leaving" : ""}`}>
       <div className="list-in" key={filter}>
        {reports === null && !failed && <p className="muted small admin-empty">Loading…</p>}
        {failed && <p className="muted small admin-empty">Couldn&apos;t load the reports.</p>}
        {reports && reports.length === 0 && <p className="muted small admin-empty">{filter === "open" ? "No open bug reports." : "Nothing here."}</p>}
        {reports?.map((r) => (
          <button key={r.id} className={`bug-row st-${r.status}`} onClick={() => swap("view", () => setOpenId(r.id))}>
            <span className="bug-row-top">
              <b>#{r.id}</b>
              <span className="admin-type">{r.category}</span>
              <span className="muted">{when(r.at)}</span>
            </span>
            <span className="bug-row-title">{r.title || r.body.slice(0, 90)}</span>
            <span className="bug-row-by muted">
              from {r.user}
              <AdminTag username={r.user} />
              {r.status !== "open" && ` · ${r.status}`}
              {r.points ? ` · +${r.points}` : ""}
            </span>
          </button>
        ))}
       </div>
      </div>
          </>
        )}
      </div>
    </div>
  );
}

function BugDetail({
  report,
  onBack,
  onOpenPlayer,
  onUpdated,
}: {
  report: BugReport;
  onBack: () => void;
  onOpenPlayer: (username: string) => void;
  onUpdated: (r: BugReport) => void;
}) {
  const [note, setNote] = useState(report.note ?? "");
  const [points, setPoints] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    setNote(report.note ?? "");
    setPoints("");
    setDone("");
    setError("");
  }, [report.id]);

  async function act(status: BugStatus) {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const pts = status === "resolved" && points.trim() ? Number(points) : undefined;
      const res = await fetch(`/api/admin/bugs/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note.trim(), points: pts }),
      });
      const b = await res.json();
      if (!res.ok) return setError(b.error ?? "That didn't work.");
      onUpdated(b.report);
      setPoints("");
      setDone(status === "open" ? "Reopened." : status === "resolved" ? `Resolved${pts ? `, +${pts} points to ${report.user}` : ""}.` : "Closed without a fix.");
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const awarded = Boolean(report.points);
  const validPoints = points.trim() === "" || (/^\d+$/.test(points.trim()) && Number(points) > 0 && Number(points) <= 1000);

  return (
    <div className="bug-detail">
      <button className="link" onClick={onBack}>
        ← All reports
      </button>
      <div className="bug-detail-head">
        <b>
          #{report.id} · {report.category}
        </b>
        <span className={`bug-pill st-${report.status}`}>{report.status === "dismissed" ? "Closed" : report.status}</span>
      </div>
      <h4>{report.title || "(no title)"}</h4>
      <p className="muted small">
        From{" "}
        <button className="admin-user" onClick={() => onOpenPlayer(report.user)}>
          {report.user}
        </button>
        <AdminTag username={report.user} />{" "}
        · {when(report.at)}
        {report.handledBy && ` · handled by ${report.handledBy}`}
      </p>
      <p className="bug-body">{report.body}</p>
      {report.tech && (
        <dl className="bug-tech">
          <dt>Page</dt>
          <dd>{report.tech.path || "?"}</dd>
          <dt>Screen</dt>
          <dd>{report.tech.viewport || "?"}</dd>
          <dt>Playing</dt>
          <dd>{report.tech.game || "?"}</dd>
          <dt>Browser</dt>
          <dd>{report.tech.ua || "?"}</dd>
        </dl>
      )}

      <div className="bug-handle">
      <label className="field">
        <span>Note to the reporter (optional, they can see it)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Fixed in the latest version. Thanks!" autoComplete="off" />
      </label>

      <div className="field">
        <span>Reward points (optional, only when resolving)</span>
        {awarded ? (
          <p className="muted small">Already awarded {report.points} points for this report.</p>
        ) : (
          <>
            <input value={points} onChange={(e) => setPoints(e.target.value)} inputMode="numeric" placeholder="0" autoComplete="off" />
            <div className="bug-quick">
              {QUICK_POINTS.map((p) => (
                <button key={p} type="button" onClick={() => setPoints(String(p))}>
                  +{p}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {error && <p className="quote-note bad">{error}</p>}
      {done && <p className="muted small">{done}</p>}

      <div className="bug-actions">
        {report.status !== "resolved" && (
          <button className="btn primary" disabled={busy || !validPoints || awarded && points.trim() !== ""} onClick={() => act("resolved")}>
            Resolve{points.trim() && validPoints && !awarded ? ` (+${Number(points)})` : ""}
          </button>
        )}
        {report.status === "open" && (
          <button className="btn" disabled={busy} onClick={() => act("dismissed")}>
            Close, no fix
          </button>
        )}
        {report.status !== "open" && (
          <button className="btn" disabled={busy} onClick={() => act("open")}>
            Reopen
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
