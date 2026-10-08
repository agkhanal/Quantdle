"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluate, fmt } from "@/lib/math";
import { capture, identify } from "@/lib/analytics";
import { MARKET_TOPIC, recordGame } from "@/lib/history";
import { loadJSON, loadStats, recordResult, saveJSON, type Stats } from "@/lib/stats";
import { dailyNumber } from "@/lib/day";
import { dayLabel, puzzleSaveKey } from "@/lib/archive";
import { levelsFor, nearestLevel } from "@/lib/generators";
import {
  DIFFICULTIES,
  MAX_GUESSES,
  TOPICS,
  isTopic,
  type Award,
  type Difficulty,
  type GuessResponse,
  type Profile,
  type PuzzleResponse,
  type RevealResponse,
  type Topic,
  type Verdict,
} from "@/lib/types";
import Logo from "./Logo";
import Modal from "./Modal";
import Confetti from "./Confetti";
import MarketGame from "./MarketGame";
import { AUTH_ERRORS, AccountPanel } from "./Account";
import { AdminPanel } from "./AdminPanel";
import { Avatar } from "./Avatar";
import { BugReport } from "./BugReport";
import { Chat } from "./Chat";
import { ChartIcon, DiceIcon, CalendarIcon, LightbulbIcon } from "./TrackIcons";
import { ArchivePanel } from "./Archive";
import { LeaderboardPanel } from "./Leaderboard";
import { PublicProfile } from "./Profile";
import { RichText } from "./RichText";
import Tutorial from "./Tutorial";
import { UserSearch } from "./UserSearch";
import Verity, { isVerity, summonVerity, takeScareFound } from "./Verity";

type Mode = "daily" | "practice";
/** Each tab has two tracks: step-by-step probability puzzles, or the market-making game. */
type Track = "puzzle" | "market";
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
const TOPIC_KEY = "quantdle-practice-topic";
const EMOJI: Record<Verdict, string> = { green: "🟩", yellow: "🟨", grey: "⬛" };

export default function Game() {
  const [mode, setMode] = useState<Mode>("daily");
  const [tracks, setTracks] = useState<Record<Mode, Track>>({ daily: "puzzle", practice: "puzzle" });
  const [today, setToday] = useState<number | null>(null);
  const [archiveDay, setArchiveDay] = useState<number | null>(null); // a past daily being replayed from the archive
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [topic, setTopic] = useState<Topic | null>(null); // practice puzzle topic; null = a mix of everything
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
  const [modal, setModal] = useState<"help" | "stats" | "result" | "account" | "leaderboard" | "search" | "player" | "archive" | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [googleOn, setGoogleOn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [viewFrom, setViewFrom] = useState<"leaderboard" | "search" | "chat" | "admin">("leaderboard");
  const [toast, setToast] = useState("");
  const [tutorial, setTutorial] = useState<"gate" | "replay" | null>(null);
  const [eggPops, setEggPops] = useState(0);
  const [eggWin, setEggWin] = useState<number | null>(null); // points from the hidden egg, shown in a popup
  const [bugUpdates, setBugUpdates] = useState(0);
  const [leaving, setLeaving] = useState(false); // old content fading out before a mode/track/difficulty switch
  const [stats, setStats] = useState<Stats | null>(null);
  const [quip, setQuip] = useState(0);
  const [showLoader, setShowLoader] = useState(false); // the skeleton only appears if loading is slow, so quick loads don't flash it
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadSeq = useRef(0);
  const appRef = useRef<HTMLDivElement>(null);
  const loadedKey = useRef("");
  const track = tracks[mode];
  const topicLevels = useMemo(() => levelsFor(topic), [topic]);

  const step = solved.length; // current step index
  const totalSteps = data?.puzzle.steps.length ?? 0;
  const rowsLeft = MAX_GUESSES - rows.length;
  const over = status === "won" || status === "lost";
  const preview = useMemo(() => (input.trim() ? evaluate(input) : undefined), [input]);
  const hintRow = rows.find((r) => r.kind === "hint" && r.step === step);
  const hintUsed = hintRow !== undefined;

  // ───────────── loading puzzles ─────────────

  const load = useCallback(async (m: Mode, d: Difficulty, t: Topic | null, exclude?: string, day?: number) => {
    const seq = ++loadSeq.current;
    loadedKey.current = puzzleKey(m, d, t, day);
    setStatus("loading");
    setData(null);
    setRows([]);
    setSolved([]);
    setFeedback(null);
    setReveal(null);
    setAward(null);
    setInput("");
    setReasoning("");
    setQuip(Math.floor(Math.random() * LOADING_QUIPS.length));
    try {
      const qs = new URLSearchParams({ mode: m, difficulty: d, ...(t ? { topic: t } : {}), ...(exclude ? { exclude } : {}), ...(day ? { day: String(day) } : {}) });
      const res = await fetch(`/api/puzzle?${qs}`);
      if (!res.ok) throw new Error(`Server said ${res.status}`);
      const body = (await res.json()) as PuzzleResponse;
      if (seq !== loadSeq.current) return; // a newer load superseded this one
      setData(body);

      if (m === "daily" && body.dailyNumber) {
        const saved = loadJSON<SavedDaily>(puzzleSaveKey(body.dailyNumber));
        if (saved && saved.puzzleId === body.puzzle.id) {
          setRows(saved.rows);
          setSolved(saved.solved);
          setStatus(saved.status);
          if (saved.status === "won" || saved.status === "lost") fetchReveal(body.token);
          return;
        }
      }
      setStatus("playing");
      capture("puzzle_started", {
        mode: m,
        topic: body.puzzle.category,
        difficulty: body.puzzle.difficulty,
        puzzle_id: body.puzzle.id,
        daily_number: body.dailyNumber,
        archive: body.archive === true,
      });
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    setStats(loadStats());
    setToday(dailyNumber());
    const savedTopic = loadJSON<string>(TOPIC_KEY);
    if (isTopic(savedTopic)) setTopic(savedTopic);
    const scareFound = takeScareFound();
    fetch("/api/auth")
      .then((r) => r.json())
      .then((b) => {
        setUser(b.user);
        if (scareFound) claimScareEgg(Boolean(b.user));
        setGoogleOn(Boolean(b.google));
        if (b.bugUpdates > 0) {
          setBugUpdates(b.bugUpdates);
          showToast("🐞 One of your bug reports was updated. Open the bug button to see it.");
        }
        if (b.pending) {
          setPendingName(b.pending.suggested);
          setModal("account");
        }
      })
      .catch(() => {});
    const authErr = new URLSearchParams(window.location.search).get("auth_error");
    if (authErr) {
      setAuthError(AUTH_ERRORS[authErr] ?? "Google sign-in failed. Try again.");
      setModal("account");
      window.history.replaceState(null, "", window.location.pathname);
    }
    // The stats page links here with ?topic=... to practice one topic (or the market game).
    const linked = new URLSearchParams(window.location.search).get("topic");
    if (isTopic(linked)) {
      const d = nearestLevel("medium", linked);
      setMode("practice");
      setTopic(linked);
      setDifficulty(d);
      saveJSON(TOPIC_KEY, linked);
      load("practice", d, linked);
    } else {
      if (linked === MARKET_TOPIC) {
        setMode("practice");
        setTracks((ts) => ({ ...ts, practice: "market" }));
      }
      load("daily", "medium", null);
    }
    if (linked !== null) window.history.replaceState(null, "", window.location.pathname);
    if (!localStorage.getItem("quantdle-seen-tutorial")) setTutorial("gate");
  }, [load]);

  // Link analytics to the signed-in player (and forget them on sign-out).
  useEffect(() => {
    identify(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, user?.points]);

  /** Marks the tutorial seen (gate skip, or finishing the slides) and closes it. */
  function closeTutorial() {
    localStorage.setItem("quantdle-seen-tutorial", "1");
    setTutorial(null);
  }

  function replayTutorial() {
    setModal(null);
    setTutorial("replay");
  }

  useEffect(() => {
    if (status !== "loading") return setShowLoader(false);
    const t = setTimeout(() => setShowLoader(true), 250);
    return () => clearTimeout(t);
  }, [status]);

  // Rotate the loading quips while the AI is cooking.
  useEffect(() => {
    if (status !== "loading") return;
    const t = setInterval(() => setQuip((q) => (q + 1) % LOADING_QUIPS.length), 2200);
    return () => clearInterval(t);
  }, [status]);

  // Persist daily progress.
  useEffect(() => {
    if (mode !== "daily" || !data?.dailyNumber || status === "loading") return;
    saveJSON(puzzleSaveKey(data.dailyNumber), {
      puzzleId: data.puzzle.id,
      rows,
      solved,
      status,
    } satisfies SavedDaily);
  }, [mode, data, rows, solved, status]);

  useEffect(() => {
    // Don't let the browser scroll down to the answer box when switching tabs or levels.
    if (status === "playing") inputRef.current?.focus({ preventScroll: true });
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

  function finish(won: boolean, finalRows: Row[]) {
    setStatus(won ? "won" : "lost");
    setStats(recordResult(won, finalRows.length, data?.archive ? undefined : data?.dailyNumber)); // a past daily isn't today's daily
    if (data) {
      const guesses = finalRows.filter((r) => r.kind === "guess");
      capture("puzzle_completed", {
        mode,
        won,
        topic: data.puzzle.category,
        difficulty: data.puzzle.difficulty,
        puzzle_id: data.puzzle.id,
        archive: data.archive === true,
        guesses: guesses.length,
        hints: finalRows.length - guesses.length,
        steps_solved: won ? totalSteps : solved.length,
      });
      recordGame({
        mode,
        kind: "puzzle",
        topic: data.puzzle.category,
        difficulty: data.puzzle.difficulty,
        won,
        misses: guesses.filter((r) => r.verdict !== "green").length,
        attempts: guesses.length,
      });
      fetchReveal(data.token);
    }
    setTimeout(() => setModal("result"), won ? 1400 : 900);
  }

  // ───────────── actions ─────────────

  /** Load the puzzle for a tab unless it's already the one on screen. */
  function ensurePuzzle(m: Mode, d: Difficulty) {
    const day = m === "daily" ? archiveDay ?? undefined : undefined;
    if (loadedKey.current !== puzzleKey(m, d, topic, day) || status === "error") load(m, d, topic, undefined, day);
  }

  /** Fade the current content out, then make the change (the new content fades in). */
  function swap(change: () => void) {
    if (leaving) return;
    holdHeight();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
    setLeaving(true);
    setTimeout(() => {
      change();
      setLeaving(false);
    }, 140);
  }

  // While content swaps (and the new puzzle loads) the page would shrink, and the browser
  // would jump you up to fit. Hold the page at its current height until the new content is in.
  function holdHeight() {
    const el = appRef.current;
    if (el) el.style.minHeight = `${el.offsetHeight}px`;
  }

  useEffect(() => {
    const el = appRef.current;
    if (!el?.style.minHeight || leaving || status === "loading") return;
    const id = setTimeout(() => (el.style.minHeight = ""), 400);
    return () => clearTimeout(id);
  }, [leaving, status]);


  function switchMode(m: Mode, t: Track = tracks[m]) {
    if (m === mode && t === track) return;
    capture("tab_switched", { mode: m, track: t });
    swap(() => {
      setMode(m);
      if (m !== "daily") setArchiveDay(null); // leaving the Daily tab ends an archive replay
      setTracks((ts) => ({ ...ts, [m]: t }));
      if (t === "puzzle") {
        // Market practice allows every level; snap back to one that has puzzles on the topic.
        const d = m === "practice" ? nearestLevel(difficulty, topic) : difficulty;
        setDifficulty(d);
        ensurePuzzle(m, d);
      }
    });
  }

  function switchTrack(t: Track) {
    switchMode(mode, t);
  }

  /** Replay a past daily from the archive (the puzzle or the market, whichever tab was picked). */
  function openArchiveDay(day: number, t: Track) {
    capture("archive_opened", { day, track: t });
    setModal(null);
    swap(() => {
      setArchiveDay(day);
      setMode("daily");
      setTracks((ts) => ({ ...ts, daily: t }));
      if (t === "puzzle") load("daily", difficulty, topic, undefined, day);
    });
  }

  /** Leave the archive and go back to today's daily. */
  function backToToday() {
    setModal(null);
    if (archiveDay === null && mode === "daily") return;
    swap(() => {
      setArchiveDay(null);
      setMode("daily");
      if (track === "puzzle") load("daily", difficulty, topic);
    });
  }

  function pickDifficulty(d: Difficulty) {
    if (d === difficulty) return;
    swap(() => {
      setDifficulty(d);
      if (track === "puzzle") load("practice", d, topic);
    });
  }

  /** Practice one topic (or null for a mix). Moves to the nearest level that has puzzles on it. */
  function pickTopic(t: Topic | null) {
    if (t === topic) return;
    swap(() => {
      const d = nearestLevel(difficulty, t);
      setTopic(t);
      setDifficulty(d);
      saveJSON(TOPIC_KEY, t);
      load("practice", d, t);
    });
  }

  /** Opens someone's public profile (your own goes to your account); closing it returns to where you came from. */
  function openPlayer(username: string, from: "leaderboard" | "search" | "chat" | "admin") {
    if (username === user?.username) return setModal("account");
    setViewing(username);
    setViewFrom(from);
    setModal("player");
  }

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast((t) => (t === text ? "" : t)), 3200);
  }

  /** Easter egg: the L in the logo. */
  async function logoClick(i: number) {
    if (i !== 6) return; // QUANTDLE: Q U A N T D L E
    setEggPops((n) => n + 1);
    if (!user) return showToast("🥚 You found an easter egg! Sign in, then click it again to claim it.");
    try {
      const res = await fetch("/api/egg", { method: "POST" });
      const body = await res.json();
      if (!res.ok) return showToast(body.error ?? "Nothing happened.");
      if (body.claimed) {
        setUser(body.profile);
        showToast(`🥚 You found an easter egg! +${body.points} points`);
      } else {
        showToast("🥚 You've already found this one.");
      }
    } catch {
      showToast("Network hiccup. Try again.");
    }
  }

  /** Easter egg: the page just came back from the hidden scare. Pays out once per account; after that, nothing. */
  async function claimScareEgg(signedIn: boolean) {
    if (!signedIn) return showToast("🥚 You found an easter egg! Sign in, then find it again to claim it.");
    try {
      const res = await fetch("/api/egg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ egg: "scare" }),
      });
      const body = await res.json();
      if (!res.ok || !body.claimed) return;
      setUser(body.profile);
      setEggWin(body.points);
      capture("easter_egg_claimed", { egg: "scare", points: body.points });
    } catch {}
  }

  function nudgeShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  async function submit() {
    if (!data || status !== "playing" || submitting) return;
    if (isVerity(input)) {
      setInput(""); // easter egg: doesn't count as a guess
      return summonVerity();
    }
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
      capture("puzzle_guess", { mode, step, verdict: g.verdict, judged_by: g.judgedBy, attempt: newRows.length, showed_work: showWork });
      if (g.award) {
        setAward(g.award);
        setUser(g.award.profile);
      }
      setInput("");

      if (g.verdict === "green" && g.solved) {
        const newSolved = [...solved, g.solved];
        setSolved(newSolved);
        setReasoning("");
        if (newSolved.length === totalSteps) finish(true, newRows);
        else if (newRows.length >= MAX_GUESSES) finish(false, newRows);
      } else if (newRows.length >= MAX_GUESSES) {
        finish(false, newRows);
      }
    } catch {
      setFeedback({ text: "Network hiccup. Try again.", verdict: "grey", judgedBy: "rules" });
    } finally {
      setSubmitting(false);
    }
  }

  async function takeHint() {
    if (!data || status !== "playing" || hintUsed || rowsLeft < 2 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token, step }),
      });
      const body = await res.json();
      if (!res.ok) return setFeedback({ text: body.error ?? "Couldn't get a hint.", verdict: "grey", judgedBy: "rules" });
      setRows((rs) => [...rs, { kind: "hint", step, text: String(body.hint) }]);
      capture("puzzle_hint", { mode, step });
    } catch {
      setFeedback({ text: "Network hiccup. Try again.", verdict: "grey", judgedBy: "rules" });
    } finally {
      setSubmitting(false);
    }
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
      capture("result_shared", { game: "puzzle", mode });
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  // ───────────── render ─────────────

  return (
    <div className="app" ref={appRef}>
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
          <button className="icon-btn" aria-label="Find a player" onClick={() => setModal("search")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" />
            </svg>
          </button>
        </div>
        <Logo onTileClick={logoClick} eggTile={6} pops={eggPops} />
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
              <Avatar name={user.username} src={user.avatar} size={38} />
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
        {(["daily", "practice"] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => switchMode(m)}>
            {m === "daily" ? "Daily" : "Practice"}
          </button>
        ))}
      </nav>

      <div className="tracks" role="tablist" aria-label="Game type">
        {(["puzzle", "market"] as Track[]).map((t) => (
          <button key={t} role="tab" aria-selected={track === t} className={track === t ? "on" : ""} onClick={() => switchTrack(t)}>
            {t === "puzzle" ? <DiceIcon /> : <ChartIcon />}
            {t === "puzzle" ? (mode === "daily" ? "Puzzle" : "Probability") : mode === "daily" ? "Market" : "Market making"}
          </button>
        ))}
      </div>

      <div className={`diffs-wrap${mode === "daily" ? " open" : ""}`} aria-hidden={mode !== "daily"} inert={mode !== "daily"}>
        <div className="diffs-clip">
          <div className="archive-bar">
            {archiveDay ? (
              <div className="archive-banner" role="status">
                <span>
                  <b>Past daily #{archiveDay}</b> · {dayLabel(archiveDay)}
                  {track === "puzzle" && " · half points, no streak"}
                </span>
                <button className="link" onClick={backToToday}>
                  Back to today →
                </button>
              </div>
            ) : (
              <button className="archive-open" onClick={() => setModal("archive")}>
                <CalendarIcon /> Past dailies
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`diffs-wrap${mode === "practice" ? " open" : ""}`} aria-hidden={mode !== "practice"} inert={mode !== "practice"}>
        <div className="diffs-clip">
          <div className="diffs">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`diff diff-${d} ${difficulty === d ? "on" : ""}`}
                onClick={() => pickDifficulty(d)}
                disabled={track === "puzzle" && (status === "loading" || !topicLevels.includes(d))}
                title={track === "puzzle" && !topicLevels.includes(d) ? `No ${DIFF_LABEL[d].toLowerCase()} ${topic} puzzles yet` : undefined}
              >
                {DIFF_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`diffs-wrap${mode === "practice" && track === "puzzle" ? " open" : ""}`}
        aria-hidden={mode !== "practice" || track !== "puzzle"}
        inert={mode !== "practice" || track !== "puzzle"}
      >
        <div className="diffs-clip">
          <div className="topics" role="group" aria-label="Topic">
            {[null, ...TOPICS].map((t) => (
              <button
                key={t ?? "mixed"}
                className={`topic ${topic === t ? "on" : ""}`}
                aria-pressed={topic === t}
                onClick={() => pickTopic(t)}
                disabled={status === "loading"}
              >
                {t ?? "Mixed"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {track === "market" ? (
        <main key={`${mode}-market`} className={leaving ? "leaving" : undefined}>
          <div className="content-in">
            {mode === "daily" ? (
              today !== null && <MarketGame key={`daily-${archiveDay ?? today}`} daily dailyNumber={archiveDay ?? today} onPractice={() => switchMode("practice", "market")} />
            ) : (
              <MarketGame key="practice" daily={false} difficulty={difficulty} />
            )}
          </div>
        </main>
      ) : (
      <main key={`${mode}-puzzle`} className={leaving ? "leaving" : undefined}>
       <div className={`content-in${status === "loading" ? " is-loading" : ""}`} key={status === "loading" ? "loading" : (data?.puzzle.id ?? status)}>
        {status === "loading" && showLoader && <Loading quip={LOADING_QUIPS[quip]} />}

        {status === "error" && (
          <div className="card center">
            <p className="muted">Couldn&apos;t load a puzzle: {errorMsg}</p>
            <button className="btn" onClick={() => load(mode, difficulty, topic, undefined, mode === "daily" ? archiveDay ?? undefined : undefined)}>
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
              <p className="story"><RichText text={data.puzzle.story} /></p>
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
                <span><RichText text={feedback.text} /></span>
                {feedback.judgedBy === "ai" && <span className="fb-by">AI judge</span>}
              </div>
            )}

            {solved.length > 0 && (
              <section className="solved-list">
                {solved.map((s, i) => (
                  <div key={i} className="solved">
                    <span className="solved-tag">{i === totalSteps - 1 ? "Final" : `Step ${i + 1}`} ✓</span>
                    <span className="solved-q"><RichText text={data.puzzle.steps[i].question} /></span>
                    <span className="solved-a">{s.answerDisplay}</span>
                    {/* Prefer the server's current text: a restored daily may hold explanations saved before math was typeset. */}
                    <span className="solved-why"><RichText text={reveal?.steps[i]?.explanation ?? s.explanation} /></span>
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
                <p className="question"><RichText text={data.puzzle.steps[step].question} /></p>

                {hintRow && (
                  <p className="hint">
                    <LightbulbIcon /><RichText text={hintRow.text} />
                  </p>
                )}

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
                    <span className={`preview ${preview === null && !isVerity(input) ? "bad" : ""}`}>
                      {preview === undefined || isVerity(input) ? "" : preview === null ? "can't read" : `= ${fmt(preview)}`}
                    </span>
                  </div>
                  <button
                    className="btn primary"
                    disabled={submitting || ((preview === undefined || preview === null) && !isVerity(input))}
                  >
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
                    <LightbulbIcon />Hint <span className="muted">(costs a guess)</span>
                  </button>
                  {mode === "practice" && (
                    <button
                      className="link"
                      type="button"
                      onClick={() => {
                        capture("puzzle_skipped", { topic: data.puzzle.category, difficulty, puzzle_id: data.puzzle.id, attempts: rows.length });
                        load("practice", difficulty, topic, data.puzzle.id);
                      }}
                    >
                      Skip →
                    </button>
                  )}
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
                  <button className="btn primary" onClick={() => load("practice", difficulty, topic, data.puzzle.id)}>
                    New puzzle →
                  </button>
                ) : archiveDay ? (
                  <button className="btn primary" onClick={backToToday}>
                    Back to today →
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
       </div>
      </main>
      )}

      <footer className="site-footer">
        <a href="/privacy">Privacy</a>
        <span aria-hidden="true">·</span>
        <a href="/terms">Terms</a>
      </footer>

      {user?.admin && <AdminPanel me={user} onMeChange={setUser} onOpenPlayer={(u) => openPlayer(u, "admin")} />}

      <BugReport
        user={user}
        context={`${mode} · ${track}${data?.puzzle ? ` · ${data.puzzle.title}` : ""}`}
        updates={bugUpdates}
        onSignIn={() => setModal("account")}
        onSeen={() => setBugUpdates(0)}
      />

      <Chat user={user} onSignIn={() => setModal("account")} onOpenPlayer={(u) => openPlayer(u, "chat")} />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {status === "won" && track === "puzzle" && <Confetti />}
    <Verity />
      {eggWin !== null && (
        <>
          <Confetti />
          <Modal title="Easter egg found! 🥚" onClose={() => setEggWin(null)}>
            <div className="egg-win">
              <div className="egg-win-points">+{eggWin} points</div>
              <p>Congratulations, you found a hidden easter egg and survived it all the way to the end. The points are already on your profile and the leaderboard.</p>
              <p className="muted">You can find it again any time, but the bonus only pays out once.</p>
              <button className="btn primary wide" onClick={() => setEggWin(null)}>
                Nice
              </button>
            </div>
          </Modal>
        </>
      )}
      {modal === "help" && (
        <Modal title="How to play" onClose={() => setModal(null)}>
          <HowTo onReplay={replayTutorial} />
        </Modal>
      )}

      {tutorial && <Tutorial startAtGate={tutorial === "gate"} onDone={closeTutorial} />}

      {modal === "stats" && (
        <Modal title="Statistics" onClose={() => setModal(null)}>
          <StatsView stats={stats} />
        </Modal>
      )}

      {modal === "result" && data && (
        <Modal title={status === "won" ? "Solved! 🎉" : "Out of guesses"} onClose={() => setModal(null)}>
          <div className="result">
            {user && award && <AwardCard award={award} />}
            {!user && (
              <div className="lb-note">
                <button className="link" onClick={() => setModal("account")}>
                  Sign in
                </button>{" "}
                to earn points, build a streak, and rank on the leaderboard.
              </div>
            )}
            {user && !award && status !== "playing" && (
              <div className="lb-note">This puzzle didn&apos;t score (already played, or not all steps were solved in order while signed in).</div>
            )}
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
                      <div className="walk-q"><RichText text={s.question} /></div>
                      <div className="walk-a">{s.answerDisplay}</div>
                      <div className="walk-why"><RichText text={s.explanation} /></div>
                    </li>
                  ))}
                </ol>
                <p className="solution"><RichText text={reveal.solution} /></p>
              </>
            ) : (
              <p className="muted">Loading solution…</p>
            )}
            <StatsView stats={stats} compact />
          </div>
        </Modal>
      )}

      {modal === "account" && (
        <Modal title={user ? "Your account" : pendingName ? "Pick a username" : "Sign in"} onClose={() => setModal(null)}>
          <AccountPanel user={user} onChange={setUser} google={googleOn} initialError={authError} pending={pendingName} onSignedIn={() => setPendingName(null)} />
        </Modal>
      )}

      {modal === "archive" && (
        <Modal title="Past dailies" onClose={() => setModal(null)}>
          <ArchivePanel track={track} signedIn={Boolean(user)} onPick={openArchiveDay} onToday={backToToday} />
        </Modal>
      )}

      {modal === "search" && (
        <Modal title="Find a player" onClose={() => setModal(null)}>
          <UserSearch onOpenPlayer={(u) => openPlayer(u, "search")} />
        </Modal>
      )}

      {modal === "player" && viewing && (
        <Modal title="Player" onClose={() => setModal(viewFrom === "chat" || viewFrom === "admin" ? null : viewFrom)}>
          <PublicProfile username={viewing} />
        </Modal>
      )}

      {modal === "leaderboard" && (
        <Modal title="Leaderboard" onClose={() => setModal(null)}>
          <LeaderboardPanel
            me={user?.username ?? null}
            mySchoolId={user?.school?.id ?? null}
            onSignIn={() => setModal("account")}
            onOpenPlayer={(u) => openPlayer(u, "leaderboard")}
          />
        </Modal>
      )}
    </div>
  );
}

// ───────────── pieces ─────────────

/** What a finished puzzle was worth: points itemised, plus streak and total. */
function AwardCard({ award }: { award: Award }) {
  return (
    <div className="award">
      {award.result === "win" ? (
        <>
          <div className="award-total">
            +{award.points} <span>points</span>
          </div>
          <ul className="award-lines">
            {award.breakdown.map((b) => (
              <li key={b.label}>
                <span>{b.label}</span>
                <b className={b.value < 0 ? "neg" : ""}>{b.value > 0 ? `+${b.value}` : b.value}</b>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="award-total">No points this time</div>
      )}
      <div className="award-meta">
        {award.streak > 0 && <span>🔥 {award.streak}-day streak</span>}
        <span>{award.profile.points.toLocaleString()} total</span>
      </div>
    </div>
  );
}

const puzzleKey = (m: Mode, d: Difficulty, t: Topic | null, day?: number | null) =>
  m === "daily" ? (day ? `daily:${day}` : "daily") : `practice:${d}:${t ?? "mixed"}`;

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
        <span className="row-text"><LightbulbIcon />hint used</span>
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

function HowTo({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="howto">
      <button className="link" onClick={onReplay} type="button">
        ↻ Replay the tutorial
      </button>
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
        guess on a <b><LightbulbIcon />hint</b>. Sign in to earn <b>points</b>, build a streak, and climb the <b>leaderboards</b>.
      </p>
      <p className="muted small">
        <b>Daily</b> is the same puzzle for everyone. <b>Practice</b> is endless: puzzles are generated from templates with
        random numbers, and every answer is double-checked by simulation. Skip any you don&apos;t like.
        Both tabs also have a <b>
          <ChartIcon size={14} /> Market
        </b>{" "}game: quote a bid and ask on a dice or coin contract and finish with a profit.
        The daily market can&apos;t be skipped; practice markets come in Easy to Expert.
      </p>
    </div>
  );
}

function StatsView({ stats, compact }: { stats: Stats | null; compact?: boolean }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  if (!stats) return null;
  const max = Math.max(1, ...stats.dist);
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  /** A shareable plain-text summary: headline numbers plus the guess distribution as little bars. */
  function statsText() {
    const lines = stats!.dist.map((n, i) => `${i + 1} ${"█".repeat(n ? Math.max(1, Math.round((n / max) * 10)) : 0)}${n ? " " : ""}${n}`);
    return [
      "Quantdle stats",
      `Played ${stats!.played} · Win ${winPct}% · Streak ${stats!.streak} · Best ${stats!.maxStreak}`,
      "",
      "Guesses to win",
      ...lines,
      "",
      window.location.origin,
    ].join("\n");
  }

  async function copyStats() {
    try {
      await navigator.clipboard.writeText(statsText());
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied("idle"), 1800);
  }

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
          <div className="dist-head">
            <h3>Guess distribution</h3>
            <button
              className={`icon-btn copy-btn${copied !== "idle" ? ` is-${copied}` : ""}`}
              onClick={copyStats}
              aria-label={copied === "ok" ? "Stats copied" : copied === "fail" ? "Couldn't copy" : "Copy stats"}
              title={copied === "ok" ? "Copied!" : copied === "fail" ? "Couldn't copy" : "Copy stats"}
            >
              {copied === "ok" ? (
                <svg key="ok" className="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : copied === "fail" ? (
                <svg key="fail" className="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg key="copy" className="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="9" width="11" height="11" rx="2.5" />
                  <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
                </svg>
              )}
            </button>
          </div>
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
          <div className="stats-actions">
            <a className="btn wide stats-link" href="/stats">
              See stats by topic →
            </a>
          </div>
        </>
      )}
    </div>
  );
}