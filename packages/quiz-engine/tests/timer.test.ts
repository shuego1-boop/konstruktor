import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QuizTimer } from '../src/timer'

describe('QuizTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── Initial state ───────────────────────────────────────────────────────

  it('should not be running before start()', () => {
    const timer = new QuizTimer(10_000)
    expect(timer.isRunning()).toBe(false)
  })

  it('should have 100% remaining before start()', () => {
    const timer = new QuizTimer(10_000)
    expect(timer.getRemainingPercent()).toBe(1)
  })

  it('should have 0ms elapsed before start()', () => {
    const timer = new QuizTimer(10_000)
    expect(timer.getElapsedMs()).toBe(0)
  })

  // ─── start() ────────────────────────────────────────────────────────────

  it('should be running after start()', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    expect(timer.isRunning()).toBe(true)
  })

  it('should throw when start() is called while already running', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    expect(() => timer.start()).toThrow()
  })

  // ─── Elapsed / remaining ─────────────────────────────────────────────────

  it('should track elapsed time', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    vi.advanceTimersByTime(3_000)
    expect(timer.getElapsedMs()).toBeCloseTo(3_000, -2)
  })

  it('should compute remaining percent correctly', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    vi.advanceTimersByTime(3_000)
    expect(timer.getRemainingPercent()).toBeCloseTo(0.7, 1)
  })

  it('should not go below 0% remaining', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    vi.advanceTimersByTime(15_000)
    expect(timer.getRemainingPercent()).toBe(0)
  })

  // ─── onTick callback ─────────────────────────────────────────────────────

  it('should call onTick periodically with remaining percent', () => {
    const onTick = vi.fn()
    const timer = new QuizTimer(10_000, { onTick, tickIntervalMs: 1_000 })
    timer.start()
    vi.advanceTimersByTime(3_000)
    expect(onTick).toHaveBeenCalledTimes(3)
    // Third tick at 3s: 70% remaining
    expect(onTick).toHaveBeenLastCalledWith(expect.closeTo(0.7, 1))
  })

  // ─── onExpire callback ────────────────────────────────────────────────────

  it('should call onExpire exactly once when time runs out', () => {
    const onExpire = vi.fn()
    const timer = new QuizTimer(10_000, { onExpire })
    timer.start()
    vi.advanceTimersByTime(10_001)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('should NOT call onExpire before time runs out', () => {
    const onExpire = vi.fn()
    const timer = new QuizTimer(10_000, { onExpire })
    timer.start()
    vi.advanceTimersByTime(9_999)
    expect(onExpire).not.toHaveBeenCalled()
  })

  // ─── stop() ──────────────────────────────────────────────────────────────

  it('should stop running after stop()', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    timer.stop()
    expect(timer.isRunning()).toBe(false)
  })

  it('should NOT fire onExpire after stop()', () => {
    const onExpire = vi.fn()
    const timer = new QuizTimer(10_000, { onExpire })
    timer.start()
    vi.advanceTimersByTime(5_000)
    timer.stop()
    vi.advanceTimersByTime(6_000)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('should NOT fire onTick after stop()', () => {
    const onTick = vi.fn()
    const timer = new QuizTimer(10_000, { onTick, tickIntervalMs: 1_000 })
    timer.start()
    vi.advanceTimersByTime(2_000)
    onTick.mockClear()
    timer.stop()
    vi.advanceTimersByTime(3_000)
    expect(onTick).not.toHaveBeenCalled()
  })

  it('should throw when stop() is called on a timer that is not running', () => {
    const timer = new QuizTimer(10_000)
    expect(() => timer.stop()).toThrow()
  })

  // ─── pause() / resume() ──────────────────────────────────────────────────

  it('should pause — time does not advance while paused', () => {
    const onExpire = vi.fn()
    const timer = new QuizTimer(10_000, { onExpire })
    timer.start()
    vi.advanceTimersByTime(5_000)
    timer.pause()
    vi.advanceTimersByTime(5_000) // would expire without pause
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('should resume after pause, counting time from where it left off', () => {
    const onExpire = vi.fn()
    const timer = new QuizTimer(10_000, { onExpire })
    timer.start()
    vi.advanceTimersByTime(5_000) // 5s elapsed
    timer.pause()
    vi.advanceTimersByTime(5_000) // frozen
    timer.resume()
    vi.advanceTimersByTime(5_001) // 5s more → expires
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('should preserve elapsed time during pause', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    vi.advanceTimersByTime(4_000)
    timer.pause()
    vi.advanceTimersByTime(3_000) // should not count
    expect(timer.getElapsedMs()).toBeCloseTo(4_000, -2)
  })

  it('should throw when pause() is called on a non-running timer', () => {
    const timer = new QuizTimer(10_000)
    expect(() => timer.pause()).toThrow()
  })

  it('should throw when resume() is called on a non-paused timer', () => {
    const timer = new QuizTimer(10_000)
    timer.start()
    expect(() => timer.resume()).toThrow()
  })
})
