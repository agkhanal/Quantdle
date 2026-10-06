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
