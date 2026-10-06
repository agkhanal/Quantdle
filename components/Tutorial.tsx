"use client";

import { useCallback, useEffect, useState } from "react";
import { evaluate, fmt, relativeError } from "@/lib/math";
import { winPoints } from "@/lib/scoring";
import type { Verdict } from "@/lib/types";
import Modal from "./Modal";
import { ChartIcon, DiceIcon } from "./TrackIcons";

const SLIDE_TITLES = ["Welcome", "How guessing works", "Try it yourself", "Points example", "Market making", "You're set!"];

interface TutorialProps {
  /** true for the first-visit gate flow; false to jump straight into the slides (replay). */
  startAtGate: boolean;
  /** Called on Skip (from the gate or any slide) or on finishing the last slide. */
  onDone: () => void;
}

export default function Tutorial({ startAtGate, onDone }: TutorialProps) {
  const [phase, setPhase] = useState<"gate" | "slides">(startAtGate ? "gate" : "slides");
  const [slide, setSlide] = useState(0);
  const last = slide === SLIDE_TITLES.length - 1;

  if (phase === "gate") {
    return (
      <Modal title="New here?" onClose={onDone}>
        <div className="tut-gate">
          <p>
            Take a 60-second tour of how Quantdle works — guessing, hints, and the market game — or jump straight
            in.
          </p>
          <div className="tut-gate-actions">
            <button className="btn" onClick={onDone} type="button">
              Skip
            </button>
            <button className="btn primary" onClick={() => setPhase("slides")} type="button">
              Start tutorial
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={SLIDE_TITLES[slide]} onClose={onDone}>
      <div className="tut">
        <div className="tut-dots" aria-label="Progress">
          {SLIDE_TITLES.map((_, i) => (
            <span key={i} className={`tut-dot ${i === slide ? "on" : i < slide ? "done" : ""}`} />
          ))}
        </div>

        <div className="tut-slide" key={slide}>
          {slide === 0 && <WelcomeSlide />}
          {slide === 1 && <GuessSlide />}
          {slide === 2 && <SampleSlide />}
          {slide === 3 && <PointsSlide />}
          {slide === 4 && <MarketSlide />}
          {slide === 5 && <DoneSlide />}
        </div>

        <div className="tut-actions">
          <button className="link" onClick={onDone} type="button">
            Skip tour
          </button>
          <div className="tut-nav">
            {slide > 0 && (
              <button className="btn" onClick={() => setSlide((s) => s - 1)} type="button">
                Back
              </button>
            )}
            <button className="btn primary" onClick={last ? onDone : () => setSlide((s) => s + 1)} type="button">
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function WelcomeSlide() {
  return (
    <div className="tut-copy">
      <p>
        <b>Quantdle</b> is Wordle for quant interview prep. Every puzzle is a quant problem split into steps that
        build to a final answer, and you get 6 guesses for the whole thing.
      </p>
      <p className="muted small">
        There are two tracks: <DiceIcon size={14} /> probability puzzles, and <ChartIcon size={14} /> market making. This tour covers both.
      </p>
    </div>
  );
}

type DemoItem =
  | { kind: "guess"; text: string; verdict: Verdict; direction: "higher" | "lower" | null }
  | { kind: "hint"; text: string };

/** A scripted guess-by-guess sequence for one step: off track, closer, then right. */
const DEMO_ITEMS: DemoItem[] = [
  { kind: "guess", text: "1/3", verdict: "grey", direction: "lower" },
  { kind: "guess", text: "1/9", verdict: "yellow", direction: "higher" },
  { kind: "hint", text: "💡 Count how many of the 36 outcomes sum to 7." },
  { kind: "guess", text: "1/6", verdict: "green", direction: null },
];
const DEMO_STEP_DELAY_MS = 700;

function GuessSlide() {
  const [revealed, setRevealed] = useState(0);

  const play = useCallback(() => {
    setRevealed(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(DEMO_ITEMS.length);
      return;
    }
    DEMO_ITEMS.forEach((_, i) => {
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), (i + 1) * DEMO_STEP_DELAY_MS);
    });
  }, []);

  useEffect(() => play(), [play]);

  return (
    <div className="tut-copy">
      <p>
        Every puzzle is split into <b>steps</b> that build to a final answer. Solve a step to unlock the next — you
        get <b>6 guesses</b> for the whole puzzle.
      </p>
      <div className="board tut-demo-board">
        {DEMO_ITEMS.map((item, i) => {
          if (i >= revealed) return <div key={i} className="row empty" />;
          if (item.kind === "hint")
            return (
              <div key={i} className="row hint-row">
                <span className="row-step">S1</span>
                <span className="row-text">{item.text}</span>
              </div>
            );
          return (
            <div key={i} className={`row flip ${item.verdict}`}>
              <span className="row-step">S1</span>
              <span className="row-text">{item.text}</span>
              <span className="row-dir">
                {item.verdict === "green" ? "✓" : item.direction === "higher" ? "↑" : "↓"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="muted small">
        ⬛ off track, 🟨 close (or the AI judge likes your approach — the arrow says which way to go), 🟩 correct. A
        💡 hint costs one guess.
      </p>
      <button className="link" onClick={play} type="button">
        ▶ Replay demo
      </button>
    </div>
  );
}

/** One easy, hardcoded step. Judged with the same math the real game uses, but nothing is sent anywhere. */
const SAMPLE_QUESTION = "Flip a fair coin twice. What's the probability of getting at least one heads?";
const SAMPLE_ANSWER = 0.75; // 3/4
const SAMPLE_TOLERANCE = 0.05;
const SAMPLE_NEAR = 0.15;
const SAMPLE_EXPLANATION = "P(at least one heads) = 1 − P(no heads) = 1 − (1/2)² = 1 − 1/4 = 3/4.";

interface SampleTry {
  text: string;
  verdict: Verdict;
  direction: "higher" | "lower" | null;
}

function SampleSlide() {
  const [input, setInput] = useState("");
  const [tries, setTries] = useState<SampleTry[]>([]);
  const solved = tries.some((t) => t.verdict === "green");
  const preview = input.trim() ? evaluate(input) : undefined;

  function submit() {
    if (solved || preview === undefined || preview === null) return;
    const relErr = relativeError(preview, SAMPLE_ANSWER);
    const verdict: Verdict = relErr <= SAMPLE_TOLERANCE ? "green" : relErr <= SAMPLE_NEAR ? "yellow" : "grey";
    const direction = verdict === "green" ? null : preview < SAMPLE_ANSWER ? "higher" : "lower";
    setTries((t) => [...t, { text: input.trim(), verdict, direction }]);
    setInput("");
  }

  return (
    <div className="tut-copy">
      <p>Try a real step — it&apos;s not scored or saved, and there&apos;s no guess limit here.</p>
      <p className="question">{SAMPLE_QUESTION}</p>
      <div className="board tut-demo-board">
        {tries.map((t, i) => (
          <div key={i} className={`row flip ${t.verdict}`}>
            <span className="row-step">S1</span>
            <span className="row-text">{t.text}</span>
            <span className="row-dir">{t.verdict === "green" ? "✓" : t.direction === "higher" ? "↑" : "↓"}</span>
          </div>
        ))}
        {!solved && <div className="row empty" />}
      </div>
      {!solved ? (
        <form
          className="answer"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="input-wrap">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 0.5, 1/2, 50%"
              autoComplete="off"
              spellCheck={false}
              aria-label="Your answer"
            />
            <span className={`preview ${preview === null ? "bad" : ""}`}>
              {preview === undefined ? "" : preview === null ? "can't read" : `= ${fmt(preview)}`}
            </span>
          </div>
          <button className="btn primary" disabled={preview === undefined || preview === null} type="submit">
            Submit
          </button>
        </form>
      ) : (
        <p className="muted small">{SAMPLE_EXPLANATION}</p>
      )}
    </div>
  );
}

/** A real breakdown from lib/scoring, fed made-up (but plausible) inputs — nothing here is actually awarded. */
const EXAMPLE_POINTS = winPoints({ difficulty: "medium", steps: 3, guesses: 4, daily: true, streak: 4 });

function PointsSlide() {
  return (
    <div className="tut-copy">
      <p>Sign in and solve a puzzle to earn points like this:</p>
      <div className="award">
        <span className="chip ghost">Example — not real points</span>
        <div className="award-total">
          +{EXAMPLE_POINTS.points} <span>points</span>
        </div>
        <ul className="award-lines">
          {EXAMPLE_POINTS.breakdown.map((b) => (
            <li key={b.label}>
              <span>{b.label}</span>
              <b className={b.value < 0 ? "neg" : ""}>{b.value > 0 ? `+${b.value}` : b.value}</b>
            </li>
          ))}
        </ul>
        <div className="award-meta">
          <span>🔥 4-day streak</span>
        </div>
      </div>
      <p className="muted small">
        Harder puzzles are worth more, fewer guesses is worth more, the daily puzzle is worth double plus a streak
        bonus, and practice points are capped per day so they can&apos;t be farmed.
      </p>
    </div>
  );
}

const MARKET_DEMO_STEPS = 3;
const MARKET_STEP_DELAY_MS = 800;

function MarketSlide() {
  const [revealed, setRevealed] = useState(0);

  const play = useCallback(() => {
    setRevealed(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(MARKET_DEMO_STEPS);
      return;
    }
    for (let i = 1; i <= MARKET_DEMO_STEPS; i++) {
      setTimeout(() => setRevealed((r) => Math.max(r, i)), i * MARKET_STEP_DELAY_MS);
    }
  }, []);

  useEffect(() => play(), [play]);

  return (
    <div className="tut-copy">
      <p>
        The other track is <b>market making</b>: a contract settles on a hidden dice or coin draw, and you quote a{" "}
        <b>bid</b> and an <b>ask</b> around where you think it&apos;s fair.
      </p>
      <div className="tut-demo-board">
        {revealed > 0 && (
          <div className="row">
            <span className="row-step">R1</span>
            <span className="row-text">14 @ 18</span>
          </div>
        )}
        {revealed > 1 && (
          <div className="feedback fb-grey" role="status">
            <span className="fb-dot" />
            <span>Sharp trader lifts your offer: buys 2 @ 18. They&apos;ve peeked at the next draw — adverse selection.</span>
          </div>
        )}
        {revealed > 2 && (
          <div className="row flip grey">
            <span className="row-step">R1</span>
            <span className="row-text">Settled 17</span>
            <span className="row-trades">P&amp;L −2</span>
          </div>
        )}
      </div>
      <p className="muted small">
        A <b>sharp</b> trader has peeked at the next draw, an <b>arb</b> trades against any mispricing, and{" "}
        <b>noise</b> traders just pay your spread. Quote tight and the noise comes more often — but so does the
        sharp trader.
      </p>
      <button className="link" onClick={play} type="button">
        ▶ Replay demo
      </button>
    </div>
  );
}

function DoneSlide() {
  return (
    <div className="tut-copy">
      <p>That&apos;s it — you&apos;re ready to go.</p>
      <p className="muted small">You can replay this tour anytime from the ? help button.</p>
    </div>
  );
}
