/** Icons for the two game tracks. They take the surrounding text colour. */

export function DiceIcon({ size = 18 }: { size?: number }) {
  return (
    <svg className="track-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.3" cy="8.3" r="1.5" />
        <circle cx="15.7" cy="8.3" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="8.3" cy="15.7" r="1.5" />
        <circle cx="15.7" cy="15.7" r="1.5" />
      </g>
    </svg>
  );
}

export function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg className="track-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function CalendarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

/** A day's result in the archive: finished (won / lost), started, or not yet played. */
export function StatusIcon({ status, size = 20 }: { status: "won" | "lost" | "playing" | "new"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (status === "won")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.16" />
        <path d="M7.8 12.4l3 3 5.4-6" />
      </svg>
    );
  if (status === "lost")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.16" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    );
  if (status === "playing")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" fillOpacity="0.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3.4" />
    </svg>
  );
}
