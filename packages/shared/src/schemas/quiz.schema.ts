import { z } from 'zod'

// ─── Option ────────────────────────────────────────────────────────────────

const optionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
})

// ─── Question Schemas ──────────────────────────────────────────────────────

const baseQuestionSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().min(0),
  text: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  timeLimit: z.number().int().min(5).max(300).optional(),
  points: z.number().int().min(1).max(1000).default(10),
  explanation: z.string().max(2000).optional(),
})

export const singleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('single_choice'),
  options: z.array(optionSchema).min(2).max(6),
  correctOptionId: z.string().uuid(),
})

export const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('multiple_choice'),
  options: z.array(optionSchema).min(2).max(6),
  correctOptionIds: z.array(z.string().uuid()).min(1),
})

export const trueFalseQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('true_false'),
  correctAnswer: z.boolean(),
})

export const textInputQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('text_input'),
  correctAnswers: z.array(z.string().min(1)).min(1).max(10),
  caseSensitive: z.boolean().default(false),
  fuzzyMatch: z.boolean().default(true),
})

export const matchingQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('matching'),
  pairs: z
    .array(
      z.object({
        id: z.string().uuid(),
        left: z.string().min(1).max(200),
        right: z.string().min(1).max(200),
      }),
    )
    .min(2)
    .max(8),
})

export const orderingQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('ordering'),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        text: z.string().min(1).max(200),
        imageUrl: z.string().url().optional(),
      }),
    )
    .min(2)
    .max(8),
  correctOrder: z.array(z.string().uuid()).min(2),
})

export const hotspotQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('hotspot'),
  imageUrl: z.string().url(),
  hotspots: z
    .array(
      z.object({
        id: z.string().uuid(),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        radius: z.number().min(1).max(50),
        label: z.string().min(1),
        isCorrect: z.boolean(),
      }),
    )
    .min(1)
    .max(10),
})

export const fillBlankQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('fill_blank'),
  textWithBlanks: z.string().min(1).max(2000),
  blanks: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
        correctAnswers: z.array(z.string().min(1)).min(1).max(5),
      }),
    )
    .min(1)
    .max(10),
})

export const questionSchema = z.discriminatedUnion('type', [
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  textInputQuestionSchema,
  matchingQuestionSchema,
  orderingQuestionSchema,
  hotspotQuestionSchema,
  fillBlankQuestionSchema,
])

// ─── Settings ──────────────────────────────────────────────────────────────

export const quizThemeSchema = z.object({
  name: z.string(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontFamily: z.string(),
  borderRadius: z.enum(['none', 'small', 'medium', 'large', 'full']),
  cardStyle: z.enum(['flat', 'elevated', 'glass']),
})

export const quizSettingsSchema = z.object({
  timePerQuestion: z.number().int().min(5).max(300).optional(),
  lives: z.number().int().min(1).max(10).optional(),
  streakMultiplier: z.boolean(),
  showCorrectAnswer: z.boolean(),
  shuffleQuestions: z.boolean(),
  shuffleAnswers: z.boolean(),
  passingScore: z.number().int().min(0).max(100).optional(),
  allowRetry: z.boolean(),
  showProgressBar: z.boolean(),
  soundEnabled: z.boolean(),
  animationsEnabled: z.boolean(),
  theme: quizThemeSchema,
})

// ─── Quiz ──────────────────────────────────────────────────────────────────

export const quizSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(100).optional(),
  coverImageUrl: z.string().url().optional(),
  questions: z.array(questionSchema).min(1).max(200),
  settings: quizSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().min(1),
})

// ─── API Input Schemas ─────────────────────────────────────────────────────

export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(100).optional(),
})

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(100).optional(),
  coverImageUrl: z.string().url().optional(),
  questions: z.array(questionSchema).min(1).max(200).optional(),
  settings: quizSettingsSchema.optional(),
})

export type CreateQuizInput = z.infer<typeof createQuizSchema>
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>
