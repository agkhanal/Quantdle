"use client";

import { useEffect, useState } from "react";
import type { School } from "@/lib/types";

const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

/** A player's picture, or a coloured initial when they haven't set one. */
export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" style={style} src={src} alt="" onError={() => setFailed(true)} />;
  }
  return (
    <span className="avatar avatar-initial" style={{ ...style, background: `hsl(${hue(name.toLowerCase())} 45% 42%)` }} aria-hidden>
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

/** A school's logo, or its initials if no logo is available. */
export function SchoolLogo({ school, size = 28 }: { school: School; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [school.id]);

  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (!failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="school-logo" style={style} src={`/api/school-logo/${encodeURIComponent(school.id)}`} alt="" loading="lazy" onError={() => setFailed(true)} />;
  }
  const initials = school.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="school-logo school-logo-initial" style={style} aria-hidden>
      {initials || school.name[0]}
    </span>
  );
}
