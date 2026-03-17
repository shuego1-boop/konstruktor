// ─── Per-question answer (varies by question type) ─────────────────────────

export type SingleChoiceAnswer = { type: 'single_choice'; optionId: string }
export type MultipleChoiceAnswer = { type: 'multiple_choice'; optionIds: string[] }
export type TrueFalseAnswer = { type: 'true_false'; value: boolean }
export type TextInputAnswer = { type: 'text_input'; text: string }
export type MatchingAnswer = { type: 'matching'; pairs: Array<{ leftId: string; rightId: string }> }
export type OrderingAnswer = { type: 'ordering'; order: string[] }
export type HotspotAnswer = { type: 'hotspot'; x: number; y: number }
export type FillBlankAnswer = { type: 'fill_blank'; answers: Record<string, string> }
export type TimeoutAnswer = { type: 'timeout' }

export type SubmittedAnswer =
  | SingleChoiceAnswer
  | MultipleChoiceAnswer
  | TrueFalseAnswer
  | TextInputAnswer
  | MatchingAnswer
  | OrderingAnswer
  | HotspotAnswer
  | FillBlankAnswer
  | TimeoutAnswer

// ─── Recorded answer (after evaluation) ────────────────────────────────────

export type QuestionAnswer = {
  questionId: string
  submittedAnswer: SubmittedAnswer
  isCorrect: boolean
  pointsEarned: number
  responseTimeMs: number
  attemptedAt: string
}

// ─── Streak tracking ────────────────────────────────────────────────────────

export type StreakData = {
  maxStreak: number
  currentStreak: number
  multiplierHistory: number[]
}

// ─── Full session result ────────────────────────────────────────────────────

export type QuizSession = {
  /** Stable ID generated on device */
  id: string
  quizId: string
  quizVersion: number
  deviceId?: string
  playerName: string
  startedAt: string
  completedAt?: string
  /** 0–100 percentage */
  score: number
  totalPoints: number
  earnedPoints: number
  isPassed?: boolean
  streakData: StreakData
  answers: QuestionAnswer[]
}

// ─── Analytics aggregation (API response type) ─────────────────────────────

export type QuestionStat = {
  questionId: string
  questionText: string
  correctRate: number
  averageResponseTimeMs: number
}

export type ScoreBucket = {
  bucket: '0-20' | '21-40' | '41-60' | '61-80' | '81-100'
  count: number
}

export type QuizAnalytics = {
  totalSessions: number
  completedSessions: number
  averageScore: number
  averageDurationSeconds: number
  passRate: number
  questionStats: QuestionStat[]
  scoreDistribution: ScoreBucket[]
}
