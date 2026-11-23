"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Reset scroll to the top on forward navigation.
 *
 * The App Router normally does this, but in some environments (and when smooth
 * scrolling is involved) it can be skipped, leaving a new page at the previous
 * scroll position. This guarantees the reset while preserving the browser's
 * own scroll restoration when going back (history index decreasing).
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const lastIndex = useRef<number | null>(null);

  useEffect(() => {
    const state = window.history.state as { idx?: number } | null;
    const index = typeof state?.idx === "number" ? state.idx : 0;
    const goingBack = lastIndex.current !== null && index < lastIndex.current;
    lastIndex.current = index;

    if (!goingBack) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return null;
}
