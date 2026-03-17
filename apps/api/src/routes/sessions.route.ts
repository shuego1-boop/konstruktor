import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { quizzes, quizSessions, questionAnswers } from '../db/schema.ts'
import { syncSessionsSchema } from '@konstruktor/shared/schemas'
import { deviceAuthMiddleware, type DeviceAuthContext } from '../middleware/deviceAuth.ts'
import type { Question } from '@konstruktor/shared'

export const sessionsRoute = new Hono<DeviceAuthContext>()

// POST /sessions — sync sessions from device (device auth)
sessionsRoute.post(
  '/',
  deviceAuthMiddleware,
  zValidator('json', syncSessionsSchema),
  async (c) => {
    const data = c.req.valid('json')

    // Find which session IDs already exist (idempotent sync)
    const incomingIds = data.sessions.map((s) => s.id)
    const existing = await db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(inArray(quizSessions.id, incomingIds))

    const existingIds = new Set(existing.map((r) => r.id))
    const newSessions = data.sessions.filter((s) => !existingIds.has(s.id))

    if (newSessions.length === 0) {
      return c.json({ synced: 0, skipped: data.sessions.length })
    }

    // Insert new sessions and normalize answers
    for (const session of newSessions) {
      await db.insert(quizSessions).values({
        id: session.id,
        quizId: session.quizId,
        quizVersion: session.quizVersion,
        deviceId: c.get('deviceId'),
        playerName: session.playerName,
        startedAt: new Date(session.startedAt),
        completedAt: session.completedAt ? new Date(session.completedAt) : null,
        score: session.score,
        totalPoints: session.totalPoints,
        earnedPoints: session.earnedPoints,
        isPassed: session.isPassed,
        streakData: session.streakData,
        answers: session.answers,
      })

      // Normalize per-question rows for analytics queries
      if (session.answers.length > 0) {
        await db.insert(questionAnswers).values(
          session.answers.map((a) => ({
            sessionId: session.id,
            questionId: a.questionId,
            answer: a.submittedAnswer,
            isCorrect: a.isCorrect,
            pointsEarned: a.pointsEarned,
            responseTimeMs: a.responseTimeMs,
            attemptedAt: new Date(a.attemptedAt),
          })),
        )
      }
    }

    return c.json({ synced: newSessions.length, skipped: existingIds.size })
  },
)

// GET /sessions/:id — enriched session detail for CRM
sessionsRoute.get('/:id', async (c) => {
  const [session] = await db
    .select()
    .from(quizSessions)
    .where(eq(quizSessions.id, c.req.param('id')))

  if (!session) return c.json({ error: 'Session not found' }, 404)

  // Fetch the quiz to get question metadata for enrichment
  const [quiz] = await db
    .select({ title: quizzes.title, questions: quizzes.questions })
    .from(quizzes)
    .where(eq(quizzes.id, session.quizId))

  const questionMap = new Map<string, Question>()
  if (quiz) {
    for (const q of quiz.questions) {
      questionMap.set(q.id, q)
    }
  }

  // Fetch normalized per-question answers
  const answerRows = await db
    .select()
    .from(questionAnswers)
    .where(eq(questionAnswers.sessionId, session.id))

  const answers = answerRows.map((a) => {
    const q = questionMap.get(a.questionId)
    // Extract the "correct answer" representation per question type
    let correctAnswer: unknown = null
    if (q) {
      if (q.type === 'single_choice') correctAnswer = q.correctOptionId
      else if (q.type === 'multiple_choice') correctAnswer = q.correctOptionIds
      else if (q.type === 'true_false') correctAnswer = q.correctAnswer
      else if (q.type === 'text_input') correctAnswer = q.correctAnswers
    }
    return {
      questionId: a.questionId,
      questionText: q?.text ?? a.questionId,
      questionType: q?.type ?? 'unknown',
      submittedAnswer: a.answer,
      correctAnswer,
      isCorrect: a.isCorrect,
      pointsEarned: a.pointsEarned,
      responseTimeMs: a.responseTimeMs,
    }
  })

  return c.json({
    id: session.id,
    playerName: session.playerName,
    quizTitle: quiz?.title ?? '',
    score: session.score,
    totalPoints: session.totalPoints,
    earnedPoints: session.earnedPoints,
    isPassed: session.isPassed,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    answers,
  })
})
