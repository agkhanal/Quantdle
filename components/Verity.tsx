"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Easter egg: Verity pops up in the corner on every page load, says hello (public/verity.mp3),
 * and lip-syncs to the clip. Browsers block sound until the visitor has interacted with the
 * page, so if autoplay is refused Verity waits and speaks on the first tap or key press.
 */

// Loudness of verity.mp3 in 50 ms steps (0–9), measured from the clip; drives the mouth.
const LOUDNESS =
  "000000000000000000000000000000000000001998888888888787654566762698977442100000166985067505588916206873100000000008972114668745133101100112986346878533870331220";
const STEP = 0.05;
// The clip has ~1.9 s of silence before the voice; start just before it.
const SPEECH_START = 1.75;

// When each part of the line is spoken (seconds into the clip).
const LINE_1 = { text: "Hello, I'm Verity!", at: 1.9, until: 3.6 };
const LINE_2 = { text: "Your personal helper friend. Ask me, I know everything.", at: 3.9, until: 7.9 };

type Phase = "hidden" | "in" | "out";

export default function Verity() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [t, setT] = useState(0); // playback position, drives mouth + bubble text
  const [needsTap, setNeedsTap] = useState(false);
  const [blink, setBlink] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const visible = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function leave(delay: number) {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => dismiss(), delay);
  }

  function dismiss() {
    visible.current = false;
    audio.current?.pause();
    setPhase("out");
  }

  function speak() {
    const a = audio.current;
    if (!a) return;
    a.currentTime = SPEECH_START; // skip the silent lead-in
    a.play()
      .then(() => {
        setNeedsTap(false);
        clearTimeout(hideTimer.current);
      })
      .catch(() => setNeedsTap(true));
  }

  // Pop in shortly after load and try to speak.
  useEffect(() => {
    const a = new Audio("/verity.mp3");
    a.volume = 0.85;
    a.addEventListener("ended", () => leave(1600));
    audio.current = a;

    const show = setTimeout(() => {
      visible.current = true;
      setPhase("in");
      speak();
    }, 700);
    // If sound was blocked and nobody taps, wander off after a while.
    leave(12000);

    // Autoplay blocked? Speak on the first interaction anywhere.
    const onFirst = () => {
      if (visible.current && audio.current?.paused && audio.current.currentTime <= SPEECH_START) speak();
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });

    return () => {
      clearTimeout(show);
      clearTimeout(hideTimer.current);
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
      a.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the audio clock while it plays.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = audio.current;
      if (a && !a.paused) setT(a.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Blink every few seconds.
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  if (phase === "hidden") return null;

  const playing = audio.current ? !audio.current.paused : false;
  const level = playing ? Number(LOUDNESS[Math.floor(t / STEP)] ?? 0) / 9 : 0;
  // Without sound, still show the greeting so the joke lands.
  const line1 = needsTap ? LINE_1.text : typed(LINE_1, t);
  const line2 = needsTap ? "" : typed(LINE_2, t);

  return (
    <div className={`verity ${phase}`} onAnimationEnd={(e) => phase === "out" && e.target === e.currentTarget && setPhase("hidden")}>
      {(line1 || needsTap) && (
        <div className="verity-bubble" role="status">
          <b>{line1 || "\u00a0"}</b>
          {line2 && <span>{line2}</span>}
          {needsTap && <span className="verity-tap">🔊 tap me</span>}
        </div>
      )}
      <button className="verity-face" onClick={speak} aria-label="Verity says hello (play sound)">
        <Face mouth={level} blink={blink} talking={playing} />
      </button>
      <button className="verity-close" onClick={dismiss} aria-label="Dismiss Verity">
        ×
      </button>
    </div>
  );
}

/** Reveal a line character by character while it's being said. */
function typed(line: { text: string; at: number; until: number }, t: number) {
  if (t < line.at) return "";
  const p = Math.min(1, (t - line.at) / (line.until - line.at));
  return line.text.slice(0, Math.ceil(p * line.text.length));
}

/** Verity: a big yellow smiley. `mouth` 0..1 opens the mouth with the voice. */
function Face({ mouth, blink, talking }: { mouth: number; blink: boolean; talking: boolean }) {
  const open = talking ? 0.15 + mouth * 0.85 : 0;
  const lowerY = 178 + open * 44; // control point of the lower lip
  return (
    <svg viewBox="0 0 256 256" width="100%" height="100%" aria-hidden>
      <defs>
        <radialGradient id="verity-shine" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffe866" />
          <stop offset="70%" stopColor="#f9d000" />
          <stop offset="100%" stopColor="#e9b800" />
        </radialGradient>
      </defs>
      <circle cx="128" cy="128" r="118" fill="url(#verity-shine)" />
      <circle cx="128" cy="128" r="118" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="3" />
      {/* eyes */}
      <g fill="#111">
        <ellipse cx="98" cy="98" rx="9" ry={blink ? 1.5 : 16} />
        <ellipse cx="158" cy="98" rx="9" ry={blink ? 1.5 : 16} />
      </g>
      {/* open mouth (fills in while talking) */}
      {open > 0.02 && <path d={`M62 150 Q128 ${172 - open * 6} 194 150 Q128 ${lowerY} 62 150 Z`} fill="#3a1a12" />}
      {open > 0.25 && <ellipse cx="128" cy={164 + open * 18} rx={26 * open} ry={8 * open} fill="#e2554b" />}
      {/* smile line with little curled ends */}
      <path d={`M62 150 Q128 ${lowerY} 194 150`} fill="none" stroke="#111" strokeWidth="8" strokeLinecap="round" />
      <path d="M54 141 Q60 150 66 152" fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round" />
      <path d="M202 141 Q196 150 190 152" fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}