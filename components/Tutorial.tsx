"use client";

import { useState } from "react";
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
          {slide === 1 && <PlaceholderSlide text="A demo of 🟩/🟨/⬛ and hints is coming in the next update." />}
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

function DoneSlide() {
  return (
    <div className="tut-copy">
      <p>That&apos;s it — you&apos;re ready to go.</p>
      <p className="muted small">You can replay this tour anytime from the ? help button.</p>
    </div>
  );
}
