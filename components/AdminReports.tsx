"use client";

import { useCallback, useEffect, useState } from "react";
import type { BugStatus, PlayerReport } from "@/lib/types";
import { AdminTag } from "./AdminTag";
import { useSwap } from "./useSwap";

const FILTERS: { key: BugStatus | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Handled" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

function when(at: number) {
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

/** Player reports inside the admin drawer: a list, and a detail view to act on the player and mark the report handled. */
export function AdminReports({ onOpenPlayer }: { onOpenPlayer: (username: string) => void }) {
  const [filter, setFilter] = useState<BugStatus | "all">("open");
  const [reports, setReports] = useState<PlayerReport[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [swapping, swap] = useSwap();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`, { cache: "no-store" });
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
          <ReportDetail
            report={current}
            onBack={() => swap("view", () => setOpenId(null))}
            onOpenPlayer={onOpenPlayer}
            onUpdated={(r) => setReports((rs) => rs && rs.map((x) => (x.id === r.id ? r : x)))}
          />
        ) : (
          <>
            <div className="admin-filters" role="tablist" aria-label="Filter player reports">
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
                {reports && reports.length === 0 && <p className="muted small admin-empty">{filter === "open" ? "No open player reports. 🎉" : "Nothing here."}</p>}
                {reports?.map((r) => (
                  <button key={r.id} className={`bug-row st-${r.status}`} onClick={() => swap("view", () => setOpenId(r.id))}>
                    <span className="bug-row-top">
                      <b>#{r.id}</b>
                      <span className="admin-type">{r.reason}</span>
                      <span className="muted">{when(r.at)}</span>
                    </span>
                    <span className="bug-row-title">
                      <b>{r.user}</b>
                      {r.message ? `: “${r.message.text.slice(0, 80)}”` : r.details ? ` · ${r.details.slice(0, 80)}` : ""}
                    </span>
                    <span className="bug-row-by muted">
                      reported by {r.by}
                      {r.status !== "open" && ` · ${r.status === "resolved" ? "handled" : r.status}`}
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

function ReportDetail({
  report,
  onBack,
  onOpenPlayer,
  onUpdated,
}: {
  report: PlayerReport;
  onBack: () => void;
  onOpenPlayer: (username: string) => void;
  onUpdated: (r: PlayerReport) => void;
}) {
  const [note, setNote] = useState(report.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    setNote(report.note ?? "");
    setDone("");
    setError("");
  }, [report.id]);

  async function call(url: string, init: RequestInit, ok: string) {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const res = await fetch(url, init);
      const b = await res.json();
      if (!res.ok) return setError(b.error ?? "That didn't work.");
      if (b.report) onUpdated(b.report);
      setDone(ok);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const act = (status: BugStatus) =>
    call(`/api/admin/reports/${report.id}`, json("PATCH", { status, note: note.trim() }), status === "open" ? "Reopened." : status === "resolved" ? "Marked handled." : "Dismissed.");

  return (
    <div className="bug-detail">
      <button className="link" onClick={onBack}>
        ← All reports
      </button>
      <div className="bug-detail-head">
        <b>
          #{report.id} · {report.reason}
        </b>
        <span className={`bug-pill st-${report.status}`}>{report.status === "resolved" ? "Handled" : report.status === "dismissed" ? "Dismissed" : "open"}</span>
      </div>
      <h4>
        <button className="admin-user" onClick={() => onOpenPlayer(report.user)}>
          {report.user}
        </button>
        <AdminTag username={report.user} />
      </h4>
      <p className="muted small">
        Reported by{" "}
        <button className="admin-user" onClick={() => onOpenPlayer(report.by)}>
          {report.by}
        </button>{" "}
        · {when(report.at)}
        {report.handledBy && ` · handled by ${report.handledBy}`}
      </p>
      {report.message && (
        <>
          <span className="muted small">Message ({when(report.message.at)})</span>
          <p className="bug-body">{report.message.text}</p>
        </>
      )}
      {report.details && (
        <>
          <span className="muted small">Details</span>
          <p className="bug-body">{report.details}</p>
        </>
      )}

      <div className="bug-handle">
        <div className="bug-quick">
          <button type="button" disabled={busy} onClick={() => call("/api/chat/mute", json("POST", { username: report.user, minutes: 60 }), `Muted ${report.user} for an hour.`)}>
            Mute 1h
          </button>
          <button type="button" disabled={busy} onClick={() => call("/api/chat/mute", json("POST", { username: report.user, minutes: 24 * 60 }), `Muted ${report.user} for a day.`)}>
            Mute 1d
          </button>
          <button type="button" disabled={busy} onClick={() => call("/api/chat/mute", json("POST", { username: report.user, ban: true }), `Banned ${report.user} from the chat.`)}>
            Ban from chat
          </button>
        </div>

        <label className="field">
          <span>Admin note (only admins see it)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Muted for a day" autoComplete="off" />
        </label>

        {error && <p className="quote-note bad">{error}</p>}
        {done && <p className="muted small">{done}</p>}

        <div className="bug-actions">
          {report.status !== "resolved" && (
            <button className="btn primary" disabled={busy} onClick={() => act("resolved")}>
              Mark handled
            </button>
          )}
          {report.status === "open" && (
            <button className="btn" disabled={busy} onClick={() => act("dismissed")}>
              Dismiss
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
