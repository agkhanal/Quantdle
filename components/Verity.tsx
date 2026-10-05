"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Easter egg: type "verity" anywhere and Verity pops up in the corner. Every time you summon
 * him he gets worse:
 *   1. happy smiley, says hello          (public/verity.mp3)
 *   2. tired face, "something is coming" (public/verity-coming.mp3)
 *   3. screaming face, "don't do that"   (public/verity-dont.mp3)
 *   4. creepy grin → the screen cracks, turns red, his monster form bursts through
 *      (public/verity-monster.png + public/verity-jumpscare.mp3), then the page reloads.
 */

type Stage = 1 | 2 | 3 | 4;
type Line = { text: string; at: number; until: number };
type Clip = { src: string; start: number; loud: string; lines: Line[] };

// Loudness of each clip in 50 ms steps (0–9), measured from the audio; drives the mouth.
const STEP = 0.05;
const CLIPS: Record<1 | 2 | 3, Clip> = {
  1: {
    src: "/verity.mp3",
    start: 1.75, // the clip has ~1.9 s of silence before the voice
    loud: "000000000000000000000000000000000000001998888888888787654566762698977442100000166985067505588916206873100000000008972114668745133101100112986346878533870331220",
    lines: [
      { text: "Hello, I'm Verity!", at: 1.9, until: 3.6 },
      { text: "Your personal helper friend. Ask me, I know everything.", at: 3.9, until: 7.9 },
    ],
  },
  2: {
    src: "/verity-coming.mp3",
    start: 0,
    loud: "9966778789888488799789500000",
    lines: [{ text: "Something is coming in 3 days…", at: 0, until: 1.1 }],
  },
  3: {
    src: "/verity-dont.mp3",
    start: 0,
    loud: "77777677887988778989998420",
    lines: [{ text: "DON'T DO THAT.", at: 0, until: 0.9 }],
  },
};
const JUMPSCARE = "/verity-jumpscare.mp3";
const MONSTER = "/verity-monster.png";

// Stage 4 timeline (ms after the creepy face shows up).
const CRACK_AT = 1500;
const BURST_AT = 2000;
const RELOAD_AT = 3600;

const SUMMON = "verity:summon";

/** True if a guess is the magic word. */
export const isVerity = (guess: string) => guess.trim().toLowerCase() === "verity";

/** Call Verity (one stage further along than last time). */
export function summonVerity() {
  window.dispatchEvent(new Event(SUMMON));
}

type Phase = "hidden" | "in" | "out";
type Scare = "off" | "crack" | "burst";

export default function Verity() {
  const [stage, setStage] = useState<Stage>(1);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [scare, setScare] = useState<Scare>("off");
  const [t, setT] = useState(0); // playback position, drives mouth + bubble text
  const [needsTap, setNeedsTap] = useState(false);
  const [blink, setBlink] = useState(false);
  const audios = useRef<Partial<Record<Stage | 5, HTMLAudioElement>>>({});
  const current = useRef<HTMLAudioElement | null>(null);
  const count = useRef(0);
  const stageRef = useRef<Stage>(1);
  const busy = useRef(false); // the jumpscare is running, ignore everything
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function audio(key: Stage | 5) {
    if (!audios.current[key]) {
      const a = new Audio(key === 5 ? JUMPSCARE : CLIPS[key as 1 | 2 | 3].src);
      a.preload = "auto";
      if (key !== 5) a.addEventListener("ended", () => leave(2200));
      audios.current[key] = a;
    }
    return audios.current[key]!;
  }

  function leave(delay: number) {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => dismiss(), delay);
  }

  function dismiss() {
    if (busy.current) return;
    current.current?.pause();
    setPhase((p) => (p === "hidden" ? p : "out"));
  }

  function speak() {
    const s = stageRef.current;
    if (s === 4) return;
    const a = audio(s);
    current.current?.pause();
    current.current = a;
    a.currentTime = CLIPS[s].start;
    a.play()
      .then(() => {
        setNeedsTap(false);
        clearTimeout(hideTimer.current);
      })
      .catch(() => {
        setNeedsTap(true);
        leave(12000);
      });
  }

  // Someone typed "verity": show up, one stage further along than last time.
  function summon() {
    if (busy.current) return;
    count.current += 1;
    const s = Math.min(count.current, 4) as Stage;
    stageRef.current = s;
    clearTimeout(hideTimer.current);
    setStage(s);
    setPhase("in");
    setNeedsTap(false);
    setT(0);

    if (s < 3) audio((s + 1) as Stage); // warm up the next clip
    if (s === 3) audio(5).load();

    if (s < 4) return speak();

    // Stage 4: grin… crack… BURST… reload.
    busy.current = true;
    current.current?.pause();
    audio(5).load();
    timers.current.push(
      setTimeout(() => {
        setScare("crack");
        document.documentElement.classList.add("verity-quake");
      }, CRACK_AT),
      setTimeout(() => {
        setScare("burst");
        const a = audio(5);
        a.currentTime = 0;
        a.volume = 1;
        a.play().catch(() => {});
      }, BURST_AT),
      setTimeout(() => window.location.reload(), RELOAD_AT),
    );
  }

  // Listen for the magic word: keystrokes anywhere, plus text inputs (phones often send
  // "Unidentified" key events, so check what actually landed in the field too).
    // Game.tsx calls summonVerity() when someone guesses "verity".
  const summonRef = useRef(summon);
  useEffect(() => {
    summonRef.current = summon;
  });
  useEffect(() => {
    const onSummon = () => summonRef.current();
    window.addEventListener(SUMMON, onSummon);
    const owned = audios.current;
    const pending = timers.current;
    return () => {
      window.removeEventListener(SUMMON, onSummon);
      pending.forEach(clearTimeout);
      clearTimeout(hideTimer.current);
      Object.values(owned).forEach((a) => a?.pause());
      document.documentElement.classList.remove("verity-quake");
    };
  }, []);


  // Follow the audio clock while it plays.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = current.current;
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

  const overlay = scare !== "off" && createPortal(<Scare phase={scare} />, document.body);

  if (phase === "hidden") return overlay || null;

  const clip = stage < 4 ? CLIPS[stage as 1 | 2 | 3] : null;
  const playing = current.current ? !current.current.paused : false;
  const level = clip && playing ? Number(clip.loud[Math.floor(t / STEP)] ?? 0) / 9 : 0;
  // Without sound, still show the first line so the joke lands.
  const lines = clip ? clip.lines.map((l, i) => (needsTap ? (i === 0 ? l.text : "") : typed(l, t))) : [];
  const showBubble = clip && (lines[0] || needsTap);

  return (
    <>
      <div
        className={`verity ${phase} stage-${stage}`}
        onAnimationEnd={(e) => phase === "out" && e.target === e.currentTarget && setPhase("hidden")}
      >
        {showBubble && (
          <div className="verity-bubble" role="status" key={stage}>
            <b>{lines[0] || "\u00a0"}</b>
            {lines.slice(1).map((l, i) => l && <span key={i}>{l}</span>)}
            {needsTap && <span className="verity-tap">🔊 tap me</span>}
          </div>
        )}
        <button className="verity-face" onClick={speak} aria-label="Verity (play sound)">
          <span className="verity-morph" key={stage}>
            {stage === 1 && <HappyFace mouth={level} blink={blink} talking={playing} />}
            {stage === 2 && <TiredFace mouth={level} talking={playing} />}
            {stage === 3 && <ScreamFace mouth={level} />}
            {stage === 4 && <CreepyFace />}
          </span>
        </button>
        {stage < 4 && (
          <button className="verity-close" onClick={dismiss} aria-label="Dismiss Verity">
            ×
          </button>
        )}
      </div>
      {overlay}
    </>
  );
}

/** Reveal a line character by character while it's being said. */
function typed(line: Line, t: number) {
  if (t < line.at) return "";
  const p = Math.min(1, (t - line.at) / (line.until - line.at));
  return line.text.slice(0, Math.ceil(p * line.text.length));
}

// ───────────── faces ─────────────

/** The yellow ball every stage shares; he gets duller and grimier as things go wrong. */
function Head({ id, stops, children }: { id: string; stops: [string, string, string]; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 256 256" width="100%" height="100%" aria-hidden>
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="70%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </radialGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <pattern id={`${id}-grid`} width="11" height="11" patternUnits="userSpaceOnUse">
          <path d="M11 0H0V11" fill="none" stroke="#b7b04a" strokeOpacity=".45" strokeWidth="1" />
        </pattern>
      </defs>
      <circle cx="128" cy="128" r="118" fill={`url(#${id})`} />
      <circle cx="128" cy="128" r="118" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="3" />
      {children}
    </svg>
  );
}

/** Stage 1: the happy smiley. `mouth` 0..1 opens the mouth with the voice. */
function HappyFace({ mouth, blink, talking }: { mouth: number; blink: boolean; talking: boolean }) {
  const open = talking ? 0.15 + mouth * 0.85 : 0;
  const lowerY = 178 + open * 44; // control point of the lower lip
  return (
    <Head id="verity-happy" stops={["#ffe866", "#f9d000", "#e9b800"]}>
      <g fill="#111">
        <ellipse cx="98" cy="98" rx="9" ry={blink ? 1.5 : 16} />
        <ellipse cx="158" cy="98" rx="9" ry={blink ? 1.5 : 16} />
      </g>
      {open > 0.02 && <path d={`M62 150 Q128 ${172 - open * 6} 194 150 Q128 ${lowerY} 62 150 Z`} fill="#3a1a12" />}
      {open > 0.25 && <ellipse cx="128" cy={164 + open * 18} rx={26 * open} ry={8 * open} fill="#e2554b" />}
      <path d={`M62 150 Q128 ${lowerY} 194 150`} fill="none" stroke="#111" strokeWidth="8" strokeLinecap="round" />
      <path d="M54 141 Q60 150 66 152" fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round" />
      <path d="M202 141 Q196 150 190 152" fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round" />
    </Head>
  );
}

/** Stage 2: heavy half-shut eyelids and a little frown. */
function TiredFace({ mouth, talking }: { mouth: number; talking: boolean }) {
  const open = talking ? mouth * 14 : 0;
  return (
    <Head id="verity-tired" stops={["#f3e46a", "#e8d84a", "#d6c43a"]}>
      <ellipse cx="100" cy="112" rx="34" ry="10" fill="#7a5f6a" opacity=".35" filter="url(#verity-tired-soft)" />
      <ellipse cx="174" cy="110" rx="32" ry="10" fill="#7a5f6a" opacity=".35" filter="url(#verity-tired-soft)" />
      <g fill="#111">
        {/* the bit of pupil peeking out under each lid */}
        <path d="M94 104 Q108 117 124 104 Z" />
        <path d="M164 102 Q178 114 194 102 Z" />
      </g>
      <g fill="none" stroke="#111" strokeLinecap="round">
        <path d="M76 106 Q104 94 136 105" strokeWidth="10" />
        <path d="M152 104 Q180 94 208 101" strokeWidth="10" />
      </g>
      {open > 1 && <path d={`M108 184 Q140 168 176 180 Q140 ${178 + open} 108 184 Z`} fill="#2a1a10" />}
      <path d="M106 186 Q140 162 178 180" fill="none" stroke="#111" strokeWidth="9" strokeLinecap="round" />
    </Head>
  );
}

/** Stage 3: narrowed eyes and a big dark screaming mouth. */
function ScreamFace({ mouth }: { mouth: number }) {
  const stretch = 0.85 + mouth * 0.3;
  return (
    <Head id="verity-scream" stops={["#efe05e", "#e2d244", "#cbb834"]}>
      <ellipse cx="128" cy="104" rx="70" ry="14" fill="#5a4a3a" opacity=".3" filter="url(#verity-scream-soft)" />
      <g fill="#14120a">
        <path d="M64 106 Q88 86 114 104 Q88 114 64 106 Z" />
        <path d="M142 104 Q168 86 192 106 Q168 114 142 104 Z" />
      </g>
      <g transform={`translate(0 132) scale(1 ${stretch}) translate(0 -132)`}>
        <path d="M92 134 Q126 122 162 134 Q174 166 184 198 Q128 212 70 200 Q80 166 92 134 Z" fill="#15140a" />
        <path d="M92 134 Q126 122 162 134 Q174 166 184 198 Q128 212 70 200 Q80 166 92 134 Z" fill="url(#verity-scream-grid)" />
      </g>
    </Head>
  );
}

/** Stage 4: tiny eyes, bruised shadow, and a grin far too wide for his face. */
function CreepyFace() {
  const mouth = "M40 112 Q128 182 216 112 Q128 266 40 112 Z";
  return (
    <Head id="verity-creepy" stops={["#ecdc58", "#dfcf40", "#c2ae2c"]}>
      <defs>
        <clipPath id="verity-grin">
          <path d={mouth} />
        </clipPath>
      </defs>
      <ellipse cx="128" cy="96" rx="58" ry="20" fill="#8b2a4a" opacity=".55" filter="url(#verity-creepy-soft)" />
      <g fill="#0d0b06">
        <ellipse cx="104" cy="92" rx="7" ry="12" />
        <ellipse cx="154" cy="92" rx="7" ry="12" />
      </g>
      <path d={mouth} fill="#0d0b06" />
      <g clipPath="url(#verity-grin)" fill="none" stroke="#fff" strokeLinecap="butt">
        <path d="M60 126 Q128 196 196 126" strokeWidth="17" strokeDasharray="11 3.5" />
        <path d="M66 132 Q128 224 190 132" strokeWidth="13" strokeDasharray="10 3.5" />
      </g>
      <path d={mouth} fill="url(#verity-creepy-grid)" opacity=".5" />
      {/* scratchy hand-drawn edge */}
      <g fill="none" stroke="#0d0b06" strokeLinecap="round" strokeLinejoin="round">
        <path d={mouth} strokeWidth="6" />
        <path d="M34 100 L42 116 L36 120 M30 108 L44 112" strokeWidth="4" />
        <path d="M222 100 L214 116 L220 120 M226 108 L212 112" strokeWidth="4" />
        <path d="M70 168 L78 160 M186 168 L178 160" strokeWidth="3" />
      </g>
    </Head>
  );
}

// ───────────── the jumpscare ─────────────

/** Jagged cracks spreading from the middle of the screen, made once per scare. */
function makeCracks() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const paths: string[] = [];
  for (let i = 0; i < 14; i++) {
    let angle = (i / 14) * Math.PI * 2 + rand() * 0.3;
    let x = 50;
    let y = 50;
    let d = `M${x} ${y}`;
    for (let j = 0; j < 7; j++) {
      angle += (rand() - 0.5) * 0.7;
      const len = 4 + rand() * 9;
      x += Math.cos(angle) * len;
      y += Math.sin(angle) * len;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  // rings joining the spokes, like shattered glass
  for (const r of [6, 13, 22]) {
    let d = "";
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rr = r * (0.8 + rand() * 0.4);
      d += `${i ? " L" : "M"}${(50 + Math.cos(a) * rr).toFixed(1)} ${(50 + Math.sin(a) * rr).toFixed(1)}`;
    }
    paths.push(d);
  }
  return paths;
}

const SHARDS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return {
    dx: `${Math.cos(a) * (70 + (i % 3) * 25)}vmax`,
    dy: `${Math.sin(a) * (70 + (i % 4) * 20)}vmax`,
    rot: `${(i % 2 ? 1 : -1) * (180 + i * 37)}deg`,
    size: `${6 + (i % 5) * 3}vmin`,
    delay: `${(i % 4) * 25}ms`,
  };
});

function Scare({ phase }: { phase: "crack" | "burst" }) {
  const cracks = useMemo(makeCracks, []);
  return (
    <div className={`verity-scare ${phase}`} aria-hidden>
      <div className="verity-scare-red" />
      <img className="verity-monster" src={MONSTER} alt="" />
      <svg className="verity-cracks" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {cracks.map((d, i) => (
          <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 12}ms` }} />
        ))}
      </svg>
      {phase === "burst" &&
        SHARDS.map((s, i) => (
          <span
            key={i}
            className="verity-shard"
            style={
              {
                "--dx": s.dx,
                "--dy": s.dy,
                "--rot": s.rot,
                "--size": s.size,
                animationDelay: s.delay,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}