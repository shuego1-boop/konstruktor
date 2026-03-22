import * as React from "react";
import { cn } from "../lib/cn.ts";

type TimerBarProps = {
  /** Current elapsed time in milliseconds */
  elapsedMs: number;
  /** Total duration in milliseconds */
  durationMs: number;
  className?: string;
};

export function TimerBar({ elapsedMs, durationMs, className }: TimerBarProps) {
  const progress = durationMs > 0 ? Math.min(elapsedMs / durationMs, 1) : 0;
  const remaining = 1 - progress;
  const seconds = Math.ceil((durationMs - elapsedMs) / 1000);
  const displaySeconds = Math.max(0, seconds);

  const colorClass =
    remaining > 0.5
      ? "bg-green-500"
      : remaining > 0.25
        ? "bg-yellow-500"
        : "bg-red-500";

  const isUrgent = remaining <= 0.3 && remaining > 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            colorClass,
            isUrgent && "animate-pulse",
          )}
          style={{ width: `${remaining * 100}%` }}
          role="progressbar"
          aria-valuenow={displaySeconds}
          aria-valuemin={0}
          aria-valuemax={durationMs / 1000}
          aria-label={`Осталось ${displaySeconds} сек.`}
        />
      </div>
      <span
        className={cn(
          "text-sm font-mono tabular-nums w-10 text-right",
          isUrgent ? "text-red-600 font-bold" : "text-gray-700",
        )}
      >
        {displaySeconds}s
      </span>
    </div>
  );
}
