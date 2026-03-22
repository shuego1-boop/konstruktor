import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/cn.ts";
import { LottieIcon } from "./LottieIcon.tsx";

type StreakBadgeProps = {
  streak: number;
  className?: string;
};

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  if (streak < 2) return null;

  const tier =
    streak >= 10
      ? {
          label: "LEGENDARY",
          classes: "bg-purple-100 text-purple-800 border-purple-300",
          icon: "🔥" as const,
          lottie: "stars" as const,
        }
      : streak >= 5
        ? {
            label: "ON FIRE",
            classes: "bg-orange-100 text-orange-800 border-orange-300",
            icon: "🔥" as const,
            lottie: "fire" as const,
          }
        : {
            label: "STREAK",
            classes: "bg-yellow-100 text-yellow-800 border-yellow-300",
            icon: "⚡" as const,
            lottie: null,
          };

  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 14 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
        tier.classes,
        className,
      )}
    >
      {tier.lottie ? (
        <LottieIcon name={tier.lottie} size={20} loop />
      ) : (
        <span aria-hidden="true">{tier.icon}</span>
      )}
      <span>{tier.label}</span>
      <span className="rounded-full bg-current/10 px-1.5 py-0.5 font-mono">
        {streak}x
      </span>
    </motion.div>
  );
}
