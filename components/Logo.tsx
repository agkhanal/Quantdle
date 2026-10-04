const LETTERS = "QUANTDLE".split("");
const COLORS = ["green", "grey", "yellow", "green", "grey", "green", "yellow", "green"];

export default function Logo() {
  return (
    <div className="logo" aria-label="Quantdle">
      {LETTERS.map((l, i) => (
        <span key={i} className={`logo-tile ${COLORS[i]}`} style={{ animationDelay: `${i * 0.08}s` }}>
          {l}
        </span>
      ))}
    </div>
  );
}
