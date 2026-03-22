import * as React from "react";
import { cn } from "../lib/cn.ts";

type SkeletonVariant = "rect" | "circle" | "text";

type SkeletonProps = {
  className?: string;
  variant?: SkeletonVariant;
  count?: number;
};

const variantClasses: Record<SkeletonVariant, string> = {
  rect: "rounded-lg h-6",
  circle: "rounded-full",
  text: "rounded h-4 w-full",
};

function SkeletonItem({
  variant = "rect",
  className,
}: Omit<SkeletonProps, "count">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-gray-200",
        variantClasses[variant],
        className,
      )}
    />
  );
}

export function Skeleton({ count = 1, ...props }: SkeletonProps) {
  if (count === 1) {
    return <SkeletonItem {...props} />;
  }

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonItem key={i} {...props} />
      ))}
    </>
  );
}
