import type {
  Quiz,
  Question,
  QuizSession,
  QuestionAnswer,
  SubmittedAnswer,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  TextInputQuestion,
  MatchingQuestion,
  OrderingQuestion,
  HotspotQuestion,
  FillBlankQuestion,
} from '@konstruktor/shared'
import { calculateScore, getStreakMultiplier } from './scoring.ts'

export type EngineState = 'idle' | 'question' | 'answer_review' | 'completed'

/**
 * QuizEngine — pure TypeScript state machine driving a quiz session.
 *
 * State transitions:
 *   idle ──start()──▶ question ──submitAnswer()/timeout()──▶ answer_review ──next()──▶ question
 *                                                                                       └──▶ completed (last question or no lives left)
 */
export class QuizEngine {
  private readonly quiz: Quiz
  private readonly questions: Question[]

  private state: EngineState = 'idle'
  private currentIndex = -1
  private playerName = ''
  private answers: QuestionAnswer[] = []
  private remainingLives: number | undefined
  private currentStreak = 0
  private maxStreak = 0
  private multiplierHistory: number[] = []
  private startedAt = ''
  private questionStartedAt = 0

  constructor(quiz: Quiz) {
    this.quiz = quiz
    this.questions = quiz.settings.shuffleQuestions
      ? [...quiz.questions].sort(() => Math.random() - 0.5)
      : [...quiz.questions].sort((a, b) => a.order - b.order)
    if (quiz.settings.lives !== undefined) {
      this.remainingLives = quiz.settings.lives
    }
  }

  getState(): EngineState {
    return this.state
  }

  getTotalQuestions(): number {
    return this.questions.length
  }

  getCurrentQuestionIndex(): number {
    return this.currentIndex
  }

  getCurrentQuestion(): Question | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.questions.length) return null
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.questions[this.currentIndex]!
  }

  getPlayerName(): string {
    return this.playerName
  }

  start(playerName: string): void {
    if (this.state !== 'idle') {
      throw new Error(`QuizEngine.start() called in state "${this.state}" — only valid from "idle"`)
    }
    this.playerName = playerName
    this.startedAt = new Date().toISOString()
    this.currentIndex = 0
    this.questionStartedAt = Date.now()
    this.state = 'question'
  }

  submitAnswer(answer: SubmittedAnswer): void {
    if (this.state !== 'question') {
      throw new Error(`QuizEngine.submitAnswer() called in state "${this.state}" — only valid in "question"`)
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const question = this.questions[this.currentIndex]!

    const responseTimeMs = Date.now() - this.questionStartedAt
    const isCorrect = this._evaluate(question, answer)
    const multiplier = this.quiz.settings.streakMultiplier
      ? getStreakMultiplier(this.currentStreak)
      : 1
    const pointsEarned = calculateScore({ isCorrect, basePoints: question.points, streakMultiplier: multiplier })

    this.multiplierHistory.push(multiplier)

    if (isCorrect) {
      this.currentStreak++
      if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak
    } else {
      this.currentStreak = 0
      if (this.remainingLives !== undefined) {
        this.remainingLives--
      }
    }

    this.answers.push({
      questionId: question.id,
      submittedAnswer: answer,
      isCorrect,
      pointsEarned,
      responseTimeMs,
      attemptedAt: new Date().toISOString(),
    })

    this.state = 'answer_review'
  }

  next(): void {
    if (this.state !== 'answer_review') {
      throw new Error(`QuizEngine.next() called in state "${this.state}" — only valid in "answer_review"`)
    }

    const outOfLives = this.remainingLives !== undefined && this.remainingLives <= 0
    const lastQuestion = this.currentIndex >= this.questions.length - 1

    if (outOfLives || lastQuestion) {
      this.state = 'completed'
      return
    }

    this.currentIndex++
    this.questionStartedAt = Date.now()
    this.state = 'question'
  }

  timeout(): void {
    if (this.state !== 'question') {
      throw new Error(`QuizEngine.timeout() called in state "${this.state}" — only valid in "question"`)
    }
    this.submitAnswer({ type: 'timeout' })
  }

  getRemainingLives(): number | undefined {
    return this.remainingLives
  }

  getAnswers(): QuestionAnswer[] {
    return [...this.answers]
  }

  getResult(): Omit<QuizSession, 'id' | 'deviceId'> | null {
    if (this.state !== 'completed') return null

    const totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0)
    const earnedPoints = this.answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const score = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100)
    const isPassed =
      this.quiz.settings.passingScore !== undefined
        ? score >= this.quiz.settings.passingScore
        : undefined

    return {
      quizId: this.quiz.id,
      quizVersion: this.quiz.version,
      playerName: this.playerName,
      startedAt: this.startedAt,
      completedAt: new Date().toISOString(),
      score,
      totalPoints,
      earnedPoints,
      ...(isPassed !== undefined && { isPassed }),
      streakData: {
        maxStreak: this.maxStreak,
        currentStreak: this.currentStreak,
        multiplierHistory: this.multiplierHistory,
      },
      answers: [...this.answers],
    }
  }

  // ─── Answer evaluation ────────────────────────────────────────────────────

  private _evaluate(question: Question, answer: SubmittedAnswer): boolean {
    if (answer.type === 'timeout') return false

    switch (question.type) {
      case 'single_choice': {
        const q = question as SingleChoiceQuestion
        if (answer.type !== 'single_choice') return false
        return answer.optionId === q.correctOptionId
      }
      case 'multiple_choice': {
        const q = question as MultipleChoiceQuestion
        if (answer.type !== 'multiple_choice') return false
        const correct = new Set(q.correctOptionIds)
        const given = new Set(answer.optionIds)
        if (correct.size !== given.size) return false
        for (const id of correct) if (!given.has(id)) return false
        return true
      }
      case 'true_false': {
        const q = question as TrueFalseQuestion
        if (answer.type !== 'true_false') return false
        return answer.value === q.correctAnswer
      }
      case 'text_input': {
        const q = question as TextInputQuestion
        if (answer.type !== 'text_input') return false
        const given = q.caseSensitive ? answer.text.trim() : answer.text.trim().toLowerCase()
        return q.correctAnswers.some((correct) => {
          const normalized = q.caseSensitive ? correct.trim() : correct.trim().toLowerCase()
          if (q.fuzzyMatch) return this._fuzzyMatch(given, normalized)
          return given === normalized
        })
      }
      case 'matching': {
        const q = question as MatchingQuestion
        if (answer.type !== 'matching') return false
        if (answer.pairs.length !== q.pairs.length) return false
        const correctMap = new Map(q.pairs.map((p) => [p.id, p.right]))
        return answer.pairs.every((given) => correctMap.get(given.leftId) === given.rightId)
      }
      case 'ordering': {
        const q = question as OrderingQuestion
        if (answer.type !== 'ordering') return false
        if (answer.order.length !== q.correctOrder.length) return false
        return answer.order.every((id, i) => id === q.correctOrder[i])
      }
      case 'hotspot': {
        const q = question as HotspotQuestion
        if (answer.type !== 'hotspot') return false
        return q.hotspots.some(
          (h) =>
            h.isCorrect &&
            Math.hypot(answer.x - h.x, answer.y - h.y) <= h.radius,
        )
      }
      case 'fill_blank': {
        const q = question as FillBlankQuestion
        if (answer.type !== 'fill_blank') return false
        return q.blanks.every((blank) => {
          const given = (answer.answers[blank.id] ?? '').trim().toLowerCase()
          return blank.correctAnswers.some((c) => c.trim().toLowerCase() === given)
        })
      }
    }
  }

  /** Levenshtein-based fuzzy match: accepts up to 20% edit distance */
  private _fuzzyMatch(a: string, b: string): boolean {
    if (a === b) return true
    const maxDist = Math.floor(Math.max(a.length, b.length) * 0.2)
    if (maxDist === 0) return a === b
    return this._levenshtein(a, b) <= maxDist
  }

  private _levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    )
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i]![j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1]![j - 1]!
            : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!)
      }
    }
    return dp[m]![n]!
  }
}
