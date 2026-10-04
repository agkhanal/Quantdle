"use client";

import { useMemo } from "react";

const COLORS = ["var(--green)", "var(--yellow)", "var(--accent)", "var(--grey)"];

/** A light CSS-only confetti burst for wins. */
export default function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        symbol: i % 9 === 0 ? ["σ", "μ", "∑", "π", "e"][i % 5] : null,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: p.symbol ? "auto" : p.size,
            height: p.symbol ? "auto" : p.size * 0.6,
            background: p.symbol ? "transparent" : p.color,
            color: p.color,
            transform: `rotate(${p.rotate}deg)`,
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}
