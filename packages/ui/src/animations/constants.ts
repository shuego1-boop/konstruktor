/** Standard animation durations in seconds */
export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  dramatic: 0.8,
} as const;

/** Stagger delays between children in seconds */
export const stagger = {
  tight: 0.05,
  normal: 0.08,
  relaxed: 0.12,
  dramatic: 0.2,
} as const;

/** Delay before animation starts in seconds */
export const delay = {
  none: 0,
  short: 0.1,
  medium: 0.3,
  long: 0.5,
} as const;
