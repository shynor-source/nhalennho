"use client";

import { usePathname } from "next/navigation";

/**
 * Gentle page-enter transition (fade + small rise) driven by CSS.
 *
 * Keyed by pathname so each navigation replays the animation. Using CSS (not a
 * JS animation) means the content is never stuck invisible if JavaScript is slow
 * or fails, and `prefers-reduced-motion` is handled in globals.css.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
