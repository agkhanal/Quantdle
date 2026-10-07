"use client";

import { useId, useState } from "react";

/**
 * A disclosure that grows and shrinks instead of snapping (the browser's own <details> can't animate).
 * The title is a button with a chevron that rotates; the body is hidden from keyboard and screen readers while closed.
 */
export function Collapsible({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`collapsible${open ? " open" : ""} ${className}`.trim()}>
      <button type="button" className="collapsible-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <svg className="collapsible-chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 1l6 4-6 4z" fill="currentColor" />
        </svg>
        {title}
      </button>
      <div className="collapsible-body" id={id} inert={!open}>
        <div className="collapsible-clip">{children}</div>
      </div>
    </div>
  );
}
