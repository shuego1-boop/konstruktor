/**
 * Scoring utilities for the quiz engine.
 */

export type CalculateScoreParams = {
  isCorrect: boolean
  basePoints: number
  /** Current streak multiplier (1, 2, 3, or 4) */
  streakMultiplier: number
}

/**
 * Calculate points earned for a single answer.
 * Returns 0 for incorrect answers regardless of multiplier.
 */
export function calculateScore({ isCorrect, basePoints, streakMultiplier }: CalculateScoreParams): number {
  if (!isCorrect) return 0
  return Math.round(basePoints * streakMultiplier)
}

export type ApplyTimeBonusParams = {
  basePoints: number
  responseTimeMs: number
  /** Undefined means no time limit — return 0 bonus */
  timeLimitMs: number | undefined
}

/**
 * Calculate the time bonus awarded for a fast answer.
 * Bonus is proportional to remaining time: (remaining / total) * basePoints.
 * Always returns an integer. Returns 0 when no time limit set.
 */
export function applyTimeBonus({ basePoints, responseTimeMs, timeLimitMs }: ApplyTimeBonusParams): number {
  if (timeLimitMs === undefined) return 0
  const remaining = timeLimitMs - responseTimeMs
  if (remaining <= 0) return 0
  return Math.round((remaining / timeLimitMs) * basePoints)
}

/**
 * Get streak multiplier based on current streak count.
 *
 * Thresholds:
 *  0-2   → x1
 *  3-5   → x2
 *  6-9   → x3
 *  10+   → x4
 */
export function getStreakMultiplier(streak: number): 1 | 2 | 3 | 4 {
  if (streak >= 10) return 4
  if (streak >= 6) return 3
  if (streak >= 3) return 2
  return 1
}
