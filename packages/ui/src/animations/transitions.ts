import type { Transition } from "framer-motion";

/** Snappy spring — buttons, small UI elements */
export const springSnap: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 17,
};

/** Smooth spring — cards, modals, page transitions */
export const springSmooth: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 24,
};

/** Bouncy spring — playful elements (streak badges, score popups) */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 14,
};

/** Gentle spring — tooltips, dropdowns */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};

/** Quick tween — fast fade in/out */
export const tweenFast: Transition = {
  type: "tween",
  duration: 0.15,
  ease: "easeOut",
};

/** Normal tween — standard transitions */
export const tweenNormal: Transition = {
  type: "tween",
  duration: 0.3,
  ease: "easeOut",
};

/** Slow tween — dramatic reveals */
export const tweenSlow: Transition = {
  type: "tween",
  duration: 0.5,
  ease: "easeInOut",
};
