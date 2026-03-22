import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn.ts";

type AnimatedCounterProps = {
  /** Target value to animate to */
  value: number;
  /** Animation duration in milliseconds (default: 1000) */
  duration?: number;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Suffix to append (e.g. "%" or " pts") */
  suffix?: string;
  /** Prefix to prepend (e.g. "+" or "$") */
  prefix?: string;
  className?: string;
};

export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
