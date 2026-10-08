import type { ChatReaction } from "@/lib/types";

/** The chat reactions, drawn as icons that take the surrounding text colour. `filled` is for a reaction you've given. */
export const REACTION_LABEL: Record<ChatReaction, string> = { like: "Like", love: "Love", laugh: "Funny", fire: "Fire" };

export function ReactionIcon({ kind, filled = false, size = 15 }: { kind: ChatReaction; filled?: boolean; size?: number }) {
  const fill = filled ? "currentColor" : "none";
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "like")
    return (
      <svg {...common}>
        <path d="M7.5 11v9.2H4V11h3.5z" fill={fill} fillOpacity={filled ? 0.3 : 0} />
        <path d="M7.5 11l3.8-7.4c1.5-.1 2.6 1.2 2.2 2.7L12.6 9.6H19a2 2 0 0 1 2 2.3l-1 6.4a2.6 2.6 0 0 1-2.6 2.2H7.5" fill={fill} fillOpacity={filled ? 0.3 : 0} />
      </svg>
    );
  if (kind === "love")
    return (
      <svg {...common}>
        <path d="M12 20.4s-8-4.6-8-10.1A4.6 4.6 0 0 1 12 7.4a4.6 4.6 0 0 1 8 2.9c0 5.5-8 10.1-8 10.1z" fill={fill} fillOpacity={filled ? 0.3 : 0} />
      </svg>
    );
  if (kind === "laugh")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" fill={fill} fillOpacity={filled ? 0.3 : 0} />
        <path d="M8.2 13.6c.9 1.9 2.2 2.8 3.8 2.8s2.9-.9 3.8-2.8" />
        <path d="M9 9.8h.01M15 9.8h.01" strokeWidth="2.8" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3c.9 3.1 4.6 5 4.6 9.3a4.6 4.6 0 0 1-9.2 0c0-1.7.8-3.1 1.9-4.1.2 1.3.9 2.1 1.7 2.3C10.9 8.6 11.1 5.5 12 3z" fill={fill} fillOpacity={filled ? 0.3 : 0} />
    </svg>
  );
}

/** A smiley with a plus: the "add a reaction" button. */
export function AddReactionIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.6 12.6A9 9 0 1 1 11.4 3.4" />
      <path d="M8.2 13.6c.9 1.9 2.2 2.8 3.8 2.8s2.9-.9 3.8-2.8" />
      <path d="M9 9.8h.01M15 9.8h.01" strokeWidth="2.8" />
      <path d="M18.5 2.5v5M16 5h5" />
    </svg>
  );
}
