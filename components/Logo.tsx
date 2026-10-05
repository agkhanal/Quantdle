const LETTERS = "QUANTDLE".split("");
const COLORS = ["green", "grey", "yellow", "green", "grey", "green", "yellow", "green"];

/** The wordmark. Tiles can be given a click handler (the L hides an easter egg). */
/** `pops` counts clicks on the egg tile; it alternates between two identical animations so every click replays it. */
export default function Logo({ onTileClick, eggTile, pops = 0 }: { onTileClick?: (index: number) => void; eggTile?: number; pops?: number }) {
  return (
    <div className="logo" aria-label="Quantdle">
      {LETTERS.map((l, i) => (
        <span
          key={i}
          className={`logo-tile ${COLORS[i]}${eggTile === i && pops > 0 ? ` egg-pop-${pops % 2}` : ""}`}
          style={{ animationDelay: eggTile === i && pops > 0 ? "0s" : `${i * 0.08}s` }}
          onClick={onTileClick ? () => onTileClick(i) : undefined}
        >
          {l}
        </span>
      ))}
    </div>
  );
}
