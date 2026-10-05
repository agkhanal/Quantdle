"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const EXIT_MS = 200; // matches the exit animations in globals.css

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Play the exit animation first, then tell the parent. (If the parent swaps this dialog out
  // some other way, the pending close is cancelled so it can't close the next one.)
  const close = useCallback(() => {
    if (timer.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return onCloseRef.current();
    setClosing(true);
    timer.current = setTimeout(() => onCloseRef.current(), EXIT_MS);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className={`modal-backdrop${closing ? " closing" : ""}`} onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={close}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
