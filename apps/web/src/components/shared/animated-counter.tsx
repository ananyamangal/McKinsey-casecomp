"use client";

import * as React from "react";
import { animate, useInView } from "framer-motion";

/** Counts up to `value` when it scrolls into view. Respects formatting via `format`. */
export function AnimatedCounter({
  value,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
  durationSec = 1.1,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationSec?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = React.useState(() => format(0));

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: durationSec,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
  }, [inView, value, durationSec, format]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
