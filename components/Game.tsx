"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluate, fmt } from "@/lib/math";
import { loadJSON, loadStats, recordResult, saveJSON, type Stats } from "@/lib/stats";
import {
  DIFFICULTIES,
  MAX_GUESSES,
  type Difficulty,
  type GuessResponse,
  type Profile,
  type PuzzleResponse,
  type RevealResponse,
  type Verdict,
} from "@/lib/types";
import Logo from "./Logo";
import Modal from "./Modal";
import Confetti from "./Confetti";
import MarketGame from "./MarketGame";
import { AccountPanel, LeaderboardPanel } from "./Account";

type Mode = "daily" | "practice" | "markets";
type Status = "loading" | "playing" | "won" | "lost" | "error";

interface Row {
  kind: "guess" | "hint";
  step: number;
  text: string;
  verdict?: Verdict;
  direction?: "higher" | "lower" | null;
}

interface Feedback {
  text: string;
  verdict: Verdict;
  judgedBy: "ai" | "rules";
}

/** What we persist for the daily so a refresh doesn't lose progress. */
interface SavedDaily {
  puzzleId: string;
  rows: Row[];
  solved: { answerDisplay: string; explanation: string }[];
  status: Status;
}

const LOADING_QUIPS = [
  "Shuffling the deck…",
  "Calibrating priors…",
  "Flipping a very fair coin…",
  "Pricing your puzzle…",
  "Consulting the martingale…",
  "Rolling backward through the tree…",
  "Double-checking the arithmetic…",
  "Tightening the bid-ask…",
];

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };
const EMOJI: Record<Verdict, string> = { green: "🟩", yellow: "🟨", grey: "⬛" };

export default function Game() {
  const [mode, setMode] = useState<Mode>("daily");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [data, setData] = useState<PuzzleResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [solved, setSolved] = useState<{ answerDisplay: string; explanation: string }[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [input, setInput] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [showWork, setShowWork] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [modal, setModal] = useState<"help" | "stats" | "result" | "account" | "leaderboard" | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [credited, setCredited] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [quip, setQuip] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadSeq = useRef(0);

  const step = solved.length; // current step index
  const totalSteps = data?.puzzle.steps.length ?? 0;
  const rowsLeft = MAX_GUESSES - rows.length;
  const over = status === "won" || status === "lost";
  const preview = useMemo(() => (input.trim() ? evaluate(input) : undefined), [input]);
  const hintUsed = rows.some((r) => r.kind === "hint" && r.step === step);

  // ───────────── loading puzzles ─────────────

  const load = useCallback(async (m: Mode, d: Difficulty, exclude?: string) => {
    const seq = ++loadSeq.current;
    setStatus("loading");
    setData(null);
    setRows([]);
    setSolved([]);
    setFeedback(null);
    setReveal(null);
    setCredited(false);
    setInput("");
    setReasoning("");
    setQuip(Math.floor(Math.random() * LOADING_QUIPS.length));
    try {
      const qs = new URLSearchParams({ mode: m, difficulty: d, ...(exclude ? { exclude } : {}) });
      const res = await fetch(`/api/puzzle?${qs}`);
      if (!res.ok) throw new Error(`Server said ${res.status}`);
      const body = (await res.json()) as PuzzleResponse;
      if (seq !== loadSeq.current) return; // a newer load superseded this one
      setData(body);

      if (m === "daily" && body.dailyNumber) {
        const saved = loadJSON<SavedDaily>(`quantdle-daily-${body.dailyNumber}`);
        if (saved && saved.puzzleId === body.puzzle.id) {
          setRows(saved.rows);
          setSolved(saved.solved);
          setStatus(saved.status);
          if (saved.status === "won" || saved.status === "lost") fetchReveal(body.token);
          return;
        }
      }
      setStatus("playing");
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    setStats(loadStats());
    fetch("/api/auth")
      .then((r) => r.json())
      .then((b) => setUser(b.user))
      .catch(() => {});
    load("daily", "medium");
    if (!localStorage.getItem("quantdle-seen-help")) {
      setModal("help");
      localStorage.setItem("quantdle-seen-help", "1");
    }
  }, [load]);

  // Rotate the loading quips while the AI is cooking.
  useEffect(() => {
    if (status !== "loading") return;
    const t = setInterval(() => setQuip((q) => (q + 1) % LOADING_QUIPS.length), 2200);
    return () => clearInterval(t);
  }, [status]);

  // Persist daily progress.
  useEffect(() => {
    if (mode !== "daily" || !data?.dailyNumber || status === "loading") return;
    saveJSON(`quantdle-daily-${data.dailyNumber}`, {
      puzzleId: data.puzzle.id,
      rows,
      solved,
      status,
    } satisfies SavedDaily);
  }, [mode, data, rows, solved, status]);

  useEffect(() => {
    if (status === "playing") inputRef.current?.focus();
  }, [status, step]);

  async function fetchReveal(token: string) {
    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) setReveal((await res.json()) as RevealResponse);
    } catch {}
  }

  function finish(won: boolean, usedRows: number) {
    setStatus(won ? "won" : "lost");
    setStats(recordResult(won, usedRows, data?.dailyNumber));
    if (data) fetchReveal(data.token);
    setTimeout(() => setModal("result"), won ? 1400 : 900);
  }

  // ───────────── actions ─────────────

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    if (m !== "markets") load(m, difficulty);
  }

  function pickDifficulty(d: Difficulty) {
    setDifficulty(d);
    load("practice", d);
  }

  function nudgeShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  async function submit() {
    if (!data || status !== "playing" || submitting) return;
    if (preview === undefined || preview === null) return nudgeShake();

    setSubmitting(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.token,
          step,
          answer: input,
          reasoning: showWork ? reasoning : undefined,
          previous: rows.filter((r) => r.kind === "guess" && r.step === step).map((r) => r.text),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFeedback({ text: body.error ?? "Something went wrong.", verdict: "grey", judgedBy: "rules" });
        nudgeShake();
        return;
      }
      const g = body as GuessResponse;
      const newRows = [...rows, { kind: "guess" as const, step, text: input.trim(), verdict: g.verdict, direction: g.direction }];
      setRows(newRows);
      setFeedback({ text: g.feedback, verdict: g.verdict, judgedBy: g.judgedBy });
      if (g.credited && g.totalSolved !== undefined) {
        setCredited(true);
        setUser((u) => (u ? { ...u, solved: g.totalSolved! } : u));
      }
      setInput("");

      if (g.verdict === "green" && g.solved) {
        const newSolved = [...solved, g.solved];
        setSolved(newSolved);
        setReasoning("");
        if (newSolved.length === totalSteps) finish(true, newRows.length);
        else if (newRows.length >= MAX_GUESSES) finish(false, newRows.length);
      } else if (newRows.length >= MAX_GUESSES) {
        finish(false, newRows.length);
      }
    } catch {
      setFeedback({ text: "Network hiccup. Try again.", verdict: "grey", judgedBy: "rules" });
    } finally {
      setSubmitting(false);
    }
  }

  function takeHint() {
    if (status !== "playing" || hintUsed || rowsLeft < 2) return;
    setRows([...rows, { kind: "hint", step, text: "hint" }]);
  }

  function shareText() {
    if (!data) return "";
    const head =
      mode === "daily" && data.dailyNumber
        ? `Quantdle #${data.dailyNumber}`
        : `Quantdle Practice`;
    const score = status === "won" ? `${rows.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    const lines = data.puzzle.steps.map((_, i) => {
      const r = rows.filter((x) => x.step === i);
      const tiles = r.map((x) => (x.kind === "hint" ? "💡" : EMOJI[x.verdict!])).join("");
      return `${i === totalSteps - 1 ? "Final" : `Step ${i + 1}`} ${tiles || "⬜"}`;
    });
    return `${head} · ${DIFF_LABEL[data.puzzle.difficulty]} ${score}\n${lines.join("\n")}`;
  }

  async function share() {
    const text = shareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  // ───────────── render ─────────────

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-side">
          <button className="icon-btn" aria-label="How to play" onClick={() => setModal("help")}>
            ?
          </button>
          <button className="icon-btn" aria-label="Leaderboard" onClick={() => setModal("leaderboard")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.5A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.5 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1 1.7V7zm10 0v2.7A2 2 0 0 0 18 8V7h-1z" />
            </svg>
          </button>
        </div>
        <Logo />
        <div className="topbar-side">
          <button className="icon-btn" aria-label="Statistics" onClick={() => setModal("stats")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="3" y="12" width="4" height="9" rx="1" />
              <rect x="10" y="6" width="4" height="15" rx="1" />
              <rect x="17" y="9" width="4" height="12" rx="1" />
            </svg>
          </button>
          <button
            className={`icon-btn ${user ? "signed-in" : ""}`}
            aria-label={user ? `Account: ${user.username}` : "Sign in"}
            title={user ? user.username : "Sign in"}
            onClick={() => setModal("account")}
          >
            {user ? (
              user.username[0].toUpperCase()
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <nav className="modes" role="tablist">
        {(["daily", "practice", "markets"] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => switchMode(m)}>
            {m === "daily" ? "Daily" : m === "practice" ? "Practice" : "Markets"}
          </button>
        ))}
      </nav>

      {mode === "practice" && (
        <div className="diffs">
          {DIFFICULTIES.map((d) => (
            <button key={d} className={`diff diff-${d} ${difficulty === d ? "on" : ""}`} onClick={() => pickDifficulty(d)} disabled={status === "loading"}>
              {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
      )}

      {mode === "markets" ? (
        <main>
          <MarketGame />
        </main>
      ) : (
      <main>
        {status === "loading" && <Loading quip={LOADING_QUIPS[quip]} />}

        {status === "error" && (
          <div className="card center">
            <p className="muted">Couldn&apos;t load a puzzle: {errorMsg}</p>
            <button className="btn" onClick={() => load(mode, difficulty)}>
              Try again
            </button>
          </div>
        )}

        {data && status !== "loading" && status !== "error" && (
          <>
            <section className="card puzzle">
              <div className="meta">
                <span className={`chip diff-${data.puzzle.difficulty}`}>{DIFF_LABEL[data.puzzle.difficulty]}</span>
                <span className="chip">{data.puzzle.category}</span>
                {mode === "daily" && data.dailyNumber && <span className="chip ghost">#{data.dailyNumber}</span>}
                {data.source === "ai" && <span className="chip ghost">✦ AI-generated</span>}
                {data.source === "generated" && (
                  <span className="chip ghost" title="Generated from a template and checked by Monte Carlo simulation">
                    ∞ Generated
                  </span>
                )}
              </div>
              <h1>{data.puzzle.title}</h1>
              <p className="story">{data.puzzle.story}</p>
            </section>

            <StepChain steps={totalSteps} current={step} rows={rows} over={over} />

            <section className="board" aria-label="Guesses">
              {Array.from({ length: MAX_GUESSES }).map((_, i) => (
                <BoardRow key={i} row={rows[i]} totalSteps={totalSteps} />
              ))}
            </section>

            {feedback && (
              <div key={rows.length} className={`feedback fb-${feedback.verdict}`} role="status">
                <span className="fb-dot" />
                <span>{feedback.text}</span>
                {feedback.judgedBy === "ai" && <span className="fb-by">AI judge</span>}
              </div>
            )}

            {solved.length > 0 && (
              <section className="solved-list">
                {solved.map((s, i) => (
                  <div key={i} className="solved">
                    <span className="solved-tag">{i === totalSteps - 1 ? "Final" : `Step ${i + 1}`} ✓</span>
                    <span className="solved-q">{data.puzzle.steps[i].question}</span>
                    <span className="solved-a">{s.answerDisplay}</span>
                    <span className="solved-why">{s.explanation}</span>
                  </div>
                ))}
              </section>
            )}

            {status === "playing" && (
              <section className={`card active-step ${shake ? "shake" : ""}`}>
                <div className="step-label">
                  {step === totalSteps - 1 ? "Final answer" : `Step ${step + 1} of ${totalSteps}`}
                  <span className="rows-left">
                    {rowsLeft} {rowsLeft === 1 ? "guess" : "guesses"} left
                  </span>
                </div>
                <p className="question">{data.puzzle.steps[step].question}</p>

                {hintUsed && <p className="hint">💡 {data.puzzle.steps[step].hint}</p>}

                <form
                  className="answer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <div className="input-wrap">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. 1/6, 0.25, 12%"
                      autoComplete="off"
                      spellCheck={false}
                      inputMode="text"
                      disabled={submitting}
                      aria-label="Your answer"
                    />
                    <span className={`preview ${preview === null ? "bad" : ""}`}>
                      {preview === undefined ? "" : preview === null ? "can't read" : `= ${fmt(preview)}`}
                    </span>
                  </div>
                  <button className="btn primary" disabled={submitting || preview === undefined || preview === null}>
                    {submitting ? <span className="dots">Judging</span> : "Submit"}
                  </button>
                </form>

                <div className="tools">
                  {data.aiJudge ? (
                    <button className="link" onClick={() => setShowWork((v) => !v)} type="button">
                      {showWork ? "− Hide work" : "+ Show your work"}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button className="link" onClick={takeHint} disabled={hintUsed || rowsLeft < 2} type="button" title="Costs one guess">
                    💡 Hint <span className="muted">(costs a guess)</span>
                  </button>
                </div>
                {showWork && data.aiJudge && (
                  <textarea
                    className="work"
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    placeholder="Optional: explain your approach. The AI judge can award a 🟨 for the right idea even if the number is off."
                    rows={3}
                  />
                )}
              </section>
            )}

            {over && (
              <div className="end-actions">
                <button className="btn" onClick={() => setModal("result")}>
                  See solution
                </button>
                {mode === "practice" ? (
                  <button className="btn primary" onClick={() => load("practice", difficulty, data.puzzle.id)}>
                    New puzzle →
                  </button>
                ) : (
                  <button className="btn primary" onClick={() => switchMode("practice")}>
                    Keep practicing →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
      )}

      {status === "won" && mode !== "markets" && <Confetti />}

      {modal === "help" && (
        <Modal title="How to play" onClose={() => setModal(null)}>
          <HowTo />
        </Modal>
      )}

      {modal === "stats" && (
        <Modal title="Statistics" onClose={() => setModal(null)}>
          <StatsView stats={stats} />
        </Modal>
      )}

      {modal === "result" && data && (
        <Modal title={status === "won" ? "Solved! 🎉" : "Out of guesses"} onClose={() => setModal(null)}>
          <div className="result">
            <pre className="share-preview">{shareText()}</pre>
            <button className="btn primary wide" onClick={share}>
              {copied ? "Copied!" : "Share result"}
            </button>
            <h3>Walkthrough</h3>
            {reveal ? (
              <>
                <ol className="walk">
                  {reveal.steps.map((s, i) => (
                    <li key={i}>
                      <div className="walk-q">{s.question}</div>
                      <div className="walk-a">{s.answerDisplay}</div>
                      <div className="walk-why">{s.explanation}</div>
                    </li>
                  ))}
                </ol>
                <p className="solution">{reveal.solution}</p>
              </>
            ) : (
              <p className="muted">Loading solution…</p>
            )}
            {status === "won" && (
              <div className="lb-note">
                {user ? (
                  credited ? (
                    <>
                      🏆 +1 on the leaderboard. You&apos;ve solved <b>{user.solved}</b>.
                    </>
                  ) : (
                    <>This one didn&apos;t earn a leaderboard point (already solved, or not all steps were solved while signed in).</>
                  )
                ) : (
                  <>
                    <button className="link" onClick={() => setModal("account")}>
                      Sign in
                    </button>{" "}
                    to save solves and climb the leaderboard.
                  </>
                )}
              </div>
            )}
            <StatsView stats={stats} compact />
          </div>
        </Modal>
      )}

      {modal === "account" && (
        <Modal title={user ? "Your account" : "Sign in"} onClose={() => setModal(null)}>
          <AccountPanel user={user} onChange={setUser} />
        </Modal>
      )}

      {modal === "leaderboard" && (
        <Modal title="Leaderboard" onClose={() => setModal(null)}>
          <LeaderboardPanel onSignIn={() => setModal("account")} />
        </Modal>
      )}
    </div>
  );
}

// ───────────── pieces ─────────────

function Loading({ quip }: { quip: string; }) {
  return (
    <div className="loading">
      <div className="loading-tiles">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <p>{quip}</p>
    </div>
  );
}

function StepChain({ steps, current, rows, over }: { steps: number; current: number; rows: Row[]; over: boolean }) {
  return (
    <div className="chain" aria-label="Progress">
      {Array.from({ length: steps }).map((_, i) => {
        const stepRows = rows.filter((r) => r.step === i && r.kind === "guess");
        const best = stepRows.some((r) => r.verdict === "green")
          ? "green"
          : stepRows.some((r) => r.verdict === "yellow")
            ? "yellow"
            : stepRows.length
              ? "grey"
              : "";
        const state = i < current ? "done" : i === current && !over ? "now" : "locked";
        return (
          <div key={i} className="chain-item">
            {i > 0 && <span className={`chain-line ${i <= current ? "lit" : ""}`} />}
            <span className={`chain-node ${best} ${state}`}>{i === steps - 1 ? "★" : i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function BoardRow({ row, totalSteps }: { row?: Row; totalSteps: number }) {
  if (!row) return <div className="row empty" />;
  const label = row.step === totalSteps - 1 ? "★" : `S${row.step + 1}`;
  if (row.kind === "hint") {
    return (
      <div className="row hint-row">
        <span className="row-step">{label}</span>
        <span className="row-text">💡 hint used</span>
      </div>
    );
  }
  return (
    <div className={`row flip ${row.verdict}`}>
      <span className="row-step">{label}</span>
      <span className="row-text">{row.text}</span>
      <span className="row-dir">
        {row.verdict === "green" ? "✓" : row.direction === "higher" ? "↑" : row.direction === "lower" ? "↓" : ""}
      </span>
    </div>
  );
}

function HowTo() {
  return (
    <div className="howto">
      <p>
        Each Quantdle is a quant interview problem broken into <b>steps</b>. Solve each step to unlock the next, then
        crack the <b>final answer ★</b>. You get <b>6 guesses</b> for the whole puzzle.
      </p>
      <div className="howto-rows">
        <div className="row green">
          <span className="row-step">S1</span>
          <span className="row-text">1/6</span>
          <span className="row-dir">✓</span>
        </div>
        <p>
          <b>Green</b>: correct. On to the next step.
        </p>
        <div className="row yellow">
          <span className="row-step">S2</span>
          <span className="row-text">0.27</span>
          <span className="row-dir">↓</span>
        </div>
        <p>
          <b>Yellow</b>: close, or the AI judge sees the right idea. The arrow says which way to go.
        </p>
        <div className="row grey">
          <span className="row-step">★</span>
          <span className="row-text">12</span>
          <span className="row-dir">↑</span>
        </div>
        <p>
          <b>Grey</b>: off track. Rethink the approach.
        </p>
      </div>
      <p>
        Answer in any form: <code>0.25</code>, <code>1/4</code>, <code>25%</code>, <code>1-(5/6)^4</code>,{" "}
        <code>C(52,5)</code>, <code>e</code>. When the AI judge is on, <b>Show your work</b> lets it read your reasoning. Or burn a
        guess on a <b>💡 hint</b>. Sign in to put your solves on the <b>leaderboard</b>.
      </p>
      <p className="muted small">
        <b>Daily</b> is the same puzzle for everyone. <b>Practice</b> is endless: puzzles are generated from templates with
        random numbers, and every answer is double-checked by simulation.
        <b> Markets</b> is a market-making game: quote a bid and ask on a dice contract and try to finish with a profit.
      </p>
    </div>
  );
}

function StatsView({ stats, compact }: { stats: Stats | null; compact?: boolean }) {
  if (!stats) return null;
  const max = Math.max(1, ...stats.dist);
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  return (
    <div className={`stats ${compact ? "compact" : ""}`}>
      <div className="stat-nums">
        <div>
          <b>{stats.played}</b>
          <span>Played</span>
        </div>
        <div>
          <b>{winPct}</b>
          <span>Win %</span>
        </div>
        <div>
          <b>{stats.streak}</b>
          <span>Streak</span>
        </div>
        <div>
          <b>{stats.maxStreak}</b>
          <span>Best</span>
        </div>
      </div>
      {!compact && (
        <>
          <h3>Guess distribution</h3>
          <div className="dist">
            {stats.dist.map((n, i) => (
              <div key={i} className="dist-row">
                <span>{i + 1}</span>
                <div className="dist-bar" style={{ width: `${Math.max(8, (n / max) * 100)}%` }}>
                  {n}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}