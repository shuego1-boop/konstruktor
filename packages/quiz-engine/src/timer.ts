/**
 * QuizTimer — countdown timer with tick/expire callbacks.
 */

export type QuizTimerOptions = {
  /** Called periodically with the remaining percentage (0–1) */
  onTick?: (remainingPercent: number) => void
  /** Called once when the timer reaches zero */
  onExpire?: () => void
  /** Tick interval in ms. Defaults to 100ms */
  tickIntervalMs?: number
}

type TimerState = 'idle' | 'running' | 'paused' | 'stopped'

export class QuizTimer {
  private readonly durationMs: number
  private readonly onTick: ((remainingPercent: number) => void) | undefined
  private readonly onExpire: (() => void) | undefined
  private readonly tickIntervalMs: number

  private state: TimerState = 'idle'
  /** Total elapsed ms — accumulates across pause/resume cycles */
  private elapsedMs = 0
  /** Timestamp of the most recent start/resume call */
  private startedAt: number | null = null
  /** Interval handle for tick callbacks */
  private tickHandle: ReturnType<typeof setInterval> | null = null
  /** Timeout handle for expiration */
  private expireHandle: ReturnType<typeof setTimeout> | null = null
  /** Guard: fire onExpire at most once */
  private expired = false

  constructor(durationMs: number, options?: QuizTimerOptions) {
    this.durationMs = durationMs
    this.onTick = options?.onTick
    this.onExpire = options?.onExpire
    this.tickIntervalMs = options?.tickIntervalMs ?? 100
  }

  isRunning(): boolean {
    return this.state === 'running'
  }

  getElapsedMs(): number {
    if (this.state === 'running' && this.startedAt !== null) {
      return this.elapsedMs + (Date.now() - this.startedAt)
    }
    return this.elapsedMs
  }

  getRemainingPercent(): number {
    const remaining = this.durationMs - this.getElapsedMs()
    return Math.max(0, Math.min(1, remaining / this.durationMs))
  }

  start(): void {
    if (this.state !== 'idle') {
      throw new Error(`QuizTimer.start() called in state "${this.state}" — only valid from "idle"`)
    }
    this._run()
  }

  stop(): void {
    if (this.state !== 'running' && this.state !== 'paused') {
      throw new Error(`QuizTimer.stop() called in state "${this.state}" — only valid while running or paused`)
    }
    this._clearHandles()
    this.elapsedMs = 0
    this.startedAt = null
    this.state = 'stopped'
  }

  pause(): void {
    if (this.state !== 'running') {
      throw new Error(`QuizTimer.pause() called in state "${this.state}" — only valid while running`)
    }
    if (this.startedAt !== null) {
      this.elapsedMs += Date.now() - this.startedAt
      this.startedAt = null
    }
    this._clearHandles()
    this.state = 'paused'
  }

  resume(): void {
    if (this.state !== 'paused') {
      throw new Error(`QuizTimer.resume() called in state "${this.state}" — only valid while paused`)
    }
    this._run()
  }

  private _run(): void {
    this.state = 'running'
    this.startedAt = Date.now()

    const remainingMs = this.durationMs - this.elapsedMs

    // Schedule expiration
    this.expireHandle = setTimeout(() => {
      this.expired = true
      this.elapsedMs = this.durationMs
      this._clearHandles()
      this.state = 'stopped'
      this.onExpire?.()
    }, remainingMs)

    // Schedule periodic ticks
    if (this.onTick) {
      this.tickHandle = setInterval(() => {
        this.onTick!(this.getRemainingPercent())
      }, this.tickIntervalMs)
    }
  }

  private _clearHandles(): void {
    if (this.expireHandle !== null) {
      clearTimeout(this.expireHandle)
      this.expireHandle = null
    }
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle)
      this.tickHandle = null
    }
  }
}
