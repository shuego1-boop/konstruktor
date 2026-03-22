import * as React from "react";
import Lottie from "lottie-react";
import { cn } from "../lib/cn.ts";

import checkmarkData from "../lottie/checkmark.json";
import crossData from "../lottie/cross.json";
import trophyData from "../lottie/trophy.json";
import fireData from "../lottie/fire.json";
import starsData from "../lottie/stars.json";

const animations = {
  checkmark: checkmarkData,
  cross: crossData,
  trophy: trophyData,
  fire: fireData,
  stars: starsData,
} as const;

export type LottieAnimationName = keyof typeof animations;

type LottieIconProps = {
  name: LottieAnimationName;
  /** Size in pixels (default: 64) */
  size?: number;
  /** Play only once (default: true) */
  loop?: boolean;
  /** Start playing immediately (default: true) */
  autoplay?: boolean;
  className?: string;
};

export function LottieIcon({
  name,
  size = 64,
  loop = false,
  autoplay = true,
  className,
}: LottieIconProps) {
  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Lottie
        animationData={animations[name]}
        loop={loop}
        autoplay={autoplay}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
