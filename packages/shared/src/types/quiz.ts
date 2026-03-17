// ─── Option & Supporting Types ─────────────────────────────────────────────

export type Option = {
  id: string
  text: string
  imageUrl?: string
}

export type MatchingPair = {
  id: string
  left: string
  right: string
}

export type OrderingItem = {
  id: string
  text: string
  imageUrl?: string
}

export type Hotspot = {
  id: string
  /** Percentage 0–100 from left edge */
  x: number
  /** Percentage 0–100 from top edge */
  y: number
  /** Radius as percentage of image width */
  radius: number
  label: string
  isCorrect: boolean
}

export type Blank = {
  id: string
  /** Position index in textWithBlanks template */
  position: number
  correctAnswers: string[]
}

// ─── Question Types ────────────────────────────────────────────────────────

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'text_input'
  | 'matching'
  | 'ordering'
  | 'hotspot'
  | 'fill_blank'

type BaseQuestion = {
  id: string
  type: QuestionType
  order: number
  text: string
  imageUrl?: string
  audioUrl?: string
  /** Per-question timer override (seconds). Undefined = use quiz default */
  timeLimit?: number
  points: number
  /** Shown after the student answers */
  explanation?: string
}

export type SingleChoiceQuestion = BaseQuestion & {
  type: 'single_choice'
  options: Option[]
  correctOptionId: string
}

export type MultipleChoiceQuestion = BaseQuestion & {
  type: 'multiple_choice'
  options: Option[]
  correctOptionIds: string[]
}

export type TrueFalseQuestion = BaseQuestion & {
  type: 'true_false'
  correctAnswer: boolean
}

export type TextInputQuestion = BaseQuestion & {
  type: 'text_input'
  /** All accepted correct answers */
  correctAnswers: string[]
  caseSensitive: boolean
  fuzzyMatch: boolean
}

export type MatchingQuestion = BaseQuestion & {
  type: 'matching'
  pairs: MatchingPair[]
}

export type OrderingQuestion = BaseQuestion & {
  type: 'ordering'
  items: OrderingItem[]
  /** Correct order expressed as array of item ids */
  correctOrder: string[]
}

export type HotspotQuestion = BaseQuestion & {
  type: 'hotspot'
  /** Required for hotspot */
  imageUrl: string
  hotspots: Hotspot[]
}

export type FillBlankQuestion = BaseQuestion & {
  type: 'fill_blank'
  /** Template string with `{{blank_id}}` placeholders */
  textWithBlanks: string
  blanks: Blank[]
}

export type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | TextInputQuestion
  | MatchingQuestion
  | OrderingQuestion
  | HotspotQuestion
  | FillBlankQuestion

// ─── Quiz Settings ─────────────────────────────────────────────────────────

export type QuizTheme = {
  name: string
  primaryColor: string
  backgroundColor: string
  fontFamily: string
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full'
  cardStyle: 'flat' | 'elevated' | 'glass'
}

export type QuizSettings = {
  /** Seconds per question. Undefined = no time limit */
  timePerQuestion?: number
  /** Number of lives. Undefined = infinite */
  lives?: number
  /** Apply x2/x3/x4 multiplier for consecutive correct answers */
  streakMultiplier: boolean
  /** Show correct answer after each question */
  showCorrectAnswer: boolean
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  /** Minimum score % to pass (0–100). Undefined = no pass/fail */
  passingScore?: number
  allowRetry: boolean
  showProgressBar: boolean
  soundEnabled: boolean
  animationsEnabled: boolean
  theme: QuizTheme
}

export const DEFAULT_THEME = {
  name: 'default',
  primaryColor: '#6366f1',
  backgroundColor: '#f8fafc',
  fontFamily: 'Inter',
  borderRadius: 'medium',
  cardStyle: 'elevated',
} satisfies QuizTheme

export const DEFAULT_SETTINGS = {
  streakMultiplier: true,
  showCorrectAnswer: true,
  shuffleQuestions: false,
  shuffleAnswers: false,
  allowRetry: true,
  showProgressBar: true,
  soundEnabled: true,
  animationsEnabled: true,
  theme: DEFAULT_THEME,
} satisfies QuizSettings

// ─── Quiz ──────────────────────────────────────────────────────────────────

export type Quiz = {
  id: string
  title: string
  description?: string
  subject?: string
  gradeLevel?: string
  coverImageUrl?: string
  questions: Question[]
  settings: QuizSettings
  createdAt: string
  updatedAt: string
  /** Incremented on each publish */
  version: number
}

// ─── Pack Manifest ─────────────────────────────────────────────────────────

export type PackManifest = {
  version: 1
  quizId: string
  quizVersion: number
  title: string
  createdAt: string
  assetCount: number
  /** SHA-256 checksum of quiz.json */
  checksum: string
}
