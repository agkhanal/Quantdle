"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lets a section fade out before its content changes (the new content then animates in).
 * `swapping` is the name of the section currently fading out, so it can be given a "leaving" class.
 */
export function useSwap(ms = 120) {
  const [swapping, setSwapping] = useState<string | null>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const swap = useCallback(
    (section: string, change: () => void) => {
      if (busy.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
      busy.current = true;
      setSwapping(section);
      timer.current = setTimeout(() => {
        change();
        setSwapping(null);
        busy.current = false;
      }, ms);
    },
    [ms],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return [swapping, swap] as const;
}
