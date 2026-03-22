import type { Variants, Transition } from "framer-motion";

// ── Fade ──────────────────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

// ── Slide ─────────────────────────────────────────────────────────────────────

export const slideInRight: Variants = {
  hidden: { x: 60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 280, damping: 28 },
  },
  exit: { x: -60, opacity: 0, transition: { duration: 0.18 } },
};

export const slideInLeft: Variants = {
  hidden: { x: -60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 280, damping: 28 },
  },
  exit: { x: 60, opacity: 0, transition: { duration: 0.18 } },
};

export const slideInUp: Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
  exit: { y: -20, opacity: 0, transition: { duration: 0.18 } },
};

// ── Scale ─────────────────────────────────────────────────────────────────────

export const scaleIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 17 },
  },
  exit: { scale: 0.8, opacity: 0, transition: { duration: 0.15 } },
};

export const popIn: Variants = {
  hidden: { scale: 0.3, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
  exit: { scale: 1.8, opacity: 0, transition: { duration: 0.22 } },
};

// ── Stagger containers ───────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

// ── Stagger children ─────────────────────────────────────────────────────────

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 340, damping: 26 },
  },
};

export const staggerItemFade: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// ── Feedback ──────────────────────────────────────────────────────────────────

export const shake: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

export const pulse: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3 },
  },
};

export const correctFlash: Variants = {
  idle: { scale: 1, backgroundColor: "transparent" },
  flash: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

// ── Micro-interactions ────────────────────────────────────────────────────────

export const tapScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 17 } as Transition,
};

export const tapScaleSubtle = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 400, damping: 20 } as Transition,
};

export const hoverLift = {
  whileHover: { y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" },
  transition: { type: "spring", stiffness: 300, damping: 20 } as Transition,
};
