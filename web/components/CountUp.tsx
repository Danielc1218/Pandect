"use client";

import { useEffect, useRef } from "react";

/**
 * A stat's number, counting up from zero when the page opens. Screen readers get the real number at once;
 * with reduced motion (the system's or the site's setting) mock.css shows the final number and hides the count.
 */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const shown = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = shown.current!, t0 = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(value * (1 - (1 - k) ** 3)).toLocaleString() + suffix;
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, suffix]);
  const final = value.toLocaleString() + suffix;
  return (
    <span className="count-up">
      <span className="sr-only">{final}</span>
      <span className="final" aria-hidden="true">{final}</span>
      <span className="counting" aria-hidden="true" ref={shown}>{`0${suffix}`}</span>
    </span>
  );
}
