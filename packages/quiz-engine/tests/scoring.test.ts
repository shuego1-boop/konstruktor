import { describe, it, expect } from 'vitest'
import { calculateScore, applyTimeBonus, getStreakMultiplier } from '../src/scoring'

describe('calculateScore', () => {
  it('should return full points for a correct answer with multiplier 1', () => {
    expect(calculateScore({ isCorrect: true, basePoints: 10, streakMultiplier: 1 })).toBe(10)
  })

  it('should return 0 for a wrong answer regardless of multiplier', () => {
    expect(calculateScore({ isCorrect: false, basePoints: 10, streakMultiplier: 1 })).toBe(0)
    expect(calculateScore({ isCorrect: false, basePoints: 10, streakMultiplier: 3 })).toBe(0)
  })

  it('should apply streak multiplier x2 to correct answers', () => {
    expect(calculateScore({ isCorrect: true, basePoints: 10, streakMultiplier: 2 })).toBe(20)
  })

  it('should apply streak multiplier x3 to correct answers', () => {
    expect(calculateScore({ isCorrect: true, basePoints: 10, streakMultiplier: 3 })).toBe(30)
  })

  it('should apply streak multiplier x4 to correct answers', () => {
    expect(calculateScore({ isCorrect: true, basePoints: 10, streakMultiplier: 4 })).toBe(40)
  })

  it('should not produce fractional points — always integer', () => {
    const score = calculateScore({ isCorrect: true, basePoints: 7, streakMultiplier: 3 })
    expect(Number.isInteger(score)).toBe(true)
  })
})

describe('applyTimeBonus', () => {
  it('should return the full base points as bonus for an instant answer (0ms)', () => {
    expect(applyTimeBonus({ basePoints: 10, responseTimeMs: 0, timeLimitMs: 10_000 })).toBe(10)
  })

  it('should return approximately half the base points for a mid-time answer', () => {
    const bonus = applyTimeBonus({ basePoints: 10, responseTimeMs: 5_000, timeLimitMs: 10_000 })
    expect(bonus).toBeCloseTo(5, 0)
  })

  it('should return 0 bonus for answering exactly at the time limit', () => {
    expect(applyTimeBonus({ basePoints: 10, responseTimeMs: 10_000, timeLimitMs: 10_000 })).toBe(0)
  })

  it('should return 0 bonus when no time limit is set', () => {
    expect(applyTimeBonus({ basePoints: 10, responseTimeMs: 1_000, timeLimitMs: undefined })).toBe(0)
  })

  it('should return 0 bonus for answers after the time limit', () => {
    // Shouldn't normally happen, but engine should be resilient
    expect(applyTimeBonus({ basePoints: 10, responseTimeMs: 12_000, timeLimitMs: 10_000 })).toBe(0)
  })

  it('should always return an integer', () => {
    const bonus = applyTimeBonus({ basePoints: 10, responseTimeMs: 3_333, timeLimitMs: 10_000 })
    expect(Number.isInteger(bonus)).toBe(true)
  })
})

describe('getStreakMultiplier', () => {
  it('should return 1 for a streak of 0', () => {
    expect(getStreakMultiplier(0)).toBe(1)
  })

  it('should return 1 for streaks less than 3', () => {
    expect(getStreakMultiplier(1)).toBe(1)
    expect(getStreakMultiplier(2)).toBe(1)
  })

  it('should return 2 for streaks of 3, 4, and 5', () => {
    expect(getStreakMultiplier(3)).toBe(2)
    expect(getStreakMultiplier(4)).toBe(2)
    expect(getStreakMultiplier(5)).toBe(2)
  })

  it('should return 3 for streaks of 6, 7, 8, and 9', () => {
    expect(getStreakMultiplier(6)).toBe(3)
    expect(getStreakMultiplier(7)).toBe(3)
    expect(getStreakMultiplier(9)).toBe(3)
  })

  it('should return 4 for streaks of 10 or more', () => {
    expect(getStreakMultiplier(10)).toBe(4)
    expect(getStreakMultiplier(50)).toBe(4)
  })
})
