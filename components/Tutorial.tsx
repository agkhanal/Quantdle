"use client";

import { useCallback, useEffect, useState } from "react";
import type { Verdict } from "@/lib/types";
import Modal from "./Modal";

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

        <div className="tut-slide">
          {slide === 0 && <WelcomeSlide />}
          {slide === 1 && <GuessSlide />}
          {slide === 2 && <PlaceholderSlide text="A sample puzzle you can actually solve is coming in the next update." />}
          {slide === 3 && <PlaceholderSlide text="A worked points example is coming in the next update." />}
          {slide === 4 && <PlaceholderSlide text="A market-making demo is coming in the next update." />}
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
        There are two tracks: 🎲 probability puzzles, and 📈 market making. This tour covers both.
      </p>
    </div>
  );
}

function PlaceholderSlide({ text }: { text: string }) {
  return <p className="muted">{text}</p>;
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

function DoneSlide() {
  return (
    <div className="tut-copy">
      <p>That&apos;s it — you&apos;re ready to go.</p>
      <p className="muted small">You can replay this tour anytime from the ? help button.</p>
    </div>
  );
}
