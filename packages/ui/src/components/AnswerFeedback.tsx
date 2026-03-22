import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/cn.ts";
import { LottieIcon } from "./LottieIcon.tsx";

type AnswerFeedbackProps = {
  correct: boolean;
  explanation?: string;
  /** Show Lottie animation icon instead of text icon (default: true) */
  animated?: boolean;
  className?: string;
};

export function AnswerFeedback({
  correct,
  explanation,
  animated = true,
  className,
}: AnswerFeedbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        correct
          ? "bg-green-50 border-green-300 text-green-800"
          : "bg-red-50 border-red-300 text-red-800",
        className,
      )}
    >
      {animated ? (
        <LottieIcon
          name={correct ? "checkmark" : "cross"}
          size={32}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 15,
            delay: 0.1,
          }}
          className="text-xl leading-none mt-0.5"
          aria-hidden="true"
        >
          {correct ? "✓" : "✗"}
        </motion.span>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{correct ? "Correct!" : "Incorrect"}</p>
        {explanation && <p className="text-sm opacity-80">{explanation}</p>}
      </div>
    </motion.div>
  );
}
