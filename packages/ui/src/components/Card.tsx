import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/cn.ts";
import { springSmooth } from "../animations/transitions.ts";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  elevation?: "flat" | "raised" | "floating";
  /** Disable hover lift animation */
  static?: boolean;
};

const elevationClasses = {
  flat: "border border-gray-200",
  raised: "shadow-md border border-gray-100",
  floating: "shadow-xl border border-gray-50",
};

export function Card({
  header,
  footer,
  elevation = "raised",
  className,
  children,
  static: isStatic,
  ...props
}: CardProps) {
  return (
    <motion.div
      whileHover={
        isStatic
          ? undefined
          : { y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }
      }
      transition={springSmooth}
      {...props}
      className={cn(
        "rounded-xl bg-white overflow-hidden",
        elevationClasses[elevation],
        className,
      )}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">
          {header}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
