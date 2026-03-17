import { z } from 'zod'

const submittedAnswerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('single_choice'), optionId: z.string().uuid() }),
  z.object({ type: z.literal('multiple_choice'), optionIds: z.array(z.string().uuid()).min(1) }),
  z.object({ type: z.literal('true_false'), value: z.boolean() }),
  z.object({ type: z.literal('text_input'), text: z.string() }),
  z.object({
    type: z.literal('matching'),
    pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
  }),
  z.object({ type: z.literal('ordering'), order: z.array(z.string()) }),
  z.object({
    type: z.literal('hotspot'),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  z.object({ type: z.literal('fill_blank'), answers: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal('timeout') }),
])

const questionAnswerSchema = z.object({
  questionId: z.string().uuid(),
  submittedAnswer: submittedAnswerSchema,
  isCorrect: z.boolean(),
  pointsEarned: z.number().int().min(0),
  responseTimeMs: z.number().int().min(0),
  attemptedAt: z.string().datetime(),
})

const streakDataSchema = z.object({
  maxStreak: z.number().int().min(0),
  currentStreak: z.number().int().min(0),
  multiplierHistory: z.array(z.number()),
})

export const quizSessionSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  quizVersion: z.number().int().min(1),
  deviceId: z.string().uuid().optional(),
  playerName: z.string().min(1).max(200),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  score: z.number().int().min(0).max(100),
  totalPoints: z.number().int().min(0),
  earnedPoints: z.number().int().min(0),
  isPassed: z.boolean().optional(),
  streakData: streakDataSchema,
  answers: z.array(questionAnswerSchema),
})

export const syncSessionsSchema = z.object({
  deviceId: z.string().uuid(),
  sessions: z.array(quizSessionSchema).min(1).max(100),
})

export type SyncSessionsInput = z.infer<typeof syncSessionsSchema>

export const registerDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.enum(['android', 'windows']),
  organizationCode: z.string().min(4).max(20),
})

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>
