import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, desc, sql } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from '../db/index.ts'
import { quizzes, quizSessions } from '../db/schema.ts'
import { createQuizSchema, updateQuizSchema } from '@konstruktor/shared/schemas'
import { authMiddleware, type AuthContext } from '../middleware/auth.ts'

export const quizzesRoute = new Hono<AuthContext>()

quizzesRoute.use('*', authMiddleware)

// GET /quizzes — list teacher's quizzes with session aggregates
quizzesRoute.get('/', async (c) => {
  const user = c.get('user')
  const rows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      subject: quizzes.subject,
      status: quizzes.status,
      version: quizzes.version,
      createdAt: quizzes.createdAt,
      updatedAt: quizzes.updatedAt,
      totalSessions: sql<number>`cast(count(${quizSessions.id}) as int)`,
      averageScore: sql<number>`cast(coalesce(avg(${quizSessions.score}), 0) as int)`,
    })
    .from(quizzes)
    .leftJoin(quizSessions, eq(quizSessions.quizId, quizzes.id))
    .where(eq(quizzes.teacherId, user.id))
    .groupBy(quizzes.id)
    .orderBy(desc(quizzes.updatedAt))

  return c.json(rows)
})

// POST /quizzes — create draft quiz
quizzesRoute.post('/', zValidator('json', createQuizSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const [row] = await db
    .insert(quizzes)
    .values({
      teacherId: user.id,
      title: data.title,
      description: data.description,
      subject: data.subject,
      gradeLevel: data.gradeLevel,
      questions: [],
      settings: {
        streakMultiplier: true,
        showCorrectAnswer: true,
        shuffleQuestions: false,
        shuffleAnswers: false,
        allowRetry: true,
        showProgressBar: true,
        soundEnabled: true,
        animationsEnabled: true,
        theme: {
          name: 'default',
          primaryColor: '#6366f1',
          backgroundColor: '#f8fafc',
          fontFamily: 'Inter',
          borderRadius: 'medium',
          cardStyle: 'elevated',
        },
      },
    })
    .returning()

  return c.json(row, 201)
})

// GET /quizzes/:id — get full quiz
quizzesRoute.get('/:id', async (c) => {
  const user = c.get('user')
  const [row] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, c.req.param('id')), eq(quizzes.teacherId, user.id)))

  if (!row) return c.json({ error: 'Quiz not found' }, 404)
  return c.json(row)
})

// PUT /quizzes/:id — update quiz
quizzesRoute.put('/:id', zValidator('json', updateQuizSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const [row] = await db
    .update(quizzes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ ...(data as any), updatedAt: new Date() })
    .where(and(eq(quizzes.id, c.req.param('id')), eq(quizzes.teacherId, user.id)))
    .returning()

  if (!row) return c.json({ error: 'Quiz not found' }, 404)
  return c.json(row)
})

// POST /quizzes/:id/publish — publish and increment version
quizzesRoute.post('/:id/publish', async (c) => {
  const user = c.get('user')

  const [existing] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, c.req.param('id')), eq(quizzes.teacherId, user.id)))

  if (!existing) return c.json({ error: 'Quiz not found' }, 404)

  const [row] = await db
    .update(quizzes)
    .set({ status: 'published', version: existing.version + 1, updatedAt: new Date() })
    .where(eq(quizzes.id, existing.id))
    .returning()

  return c.json(row)
})

// DELETE /quizzes/:id — soft delete (archive)
quizzesRoute.delete('/:id', async (c) => {
  const user = c.get('user')

  const [row] = await db
    .update(quizzes)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(quizzes.id, c.req.param('id')), eq(quizzes.teacherId, user.id)))
    .returning({ id: quizzes.id })

  if (!row) return c.json({ error: 'Quiz not found' }, 404)
  return c.json({ success: true })
})

// POST /quizzes/:id/share-code — generate or return existing share code
quizzesRoute.post('/:id/share-code', async (c) => {
  const user = c.get('user')

  const [existing] = await db
    .select({ id: quizzes.id, shareCode: quizzes.shareCode, status: quizzes.status })
    .from(quizzes)
    .where(and(eq(quizzes.id, c.req.param('id')), eq(quizzes.teacherId, user.id)))

  if (!existing) return c.json({ error: 'Quiz not found' }, 404)
  if (existing.status !== 'published') return c.json({ error: 'Quiz must be published to share' }, 400)

  if (existing.shareCode) {
    return c.json({ shareCode: existing.shareCode })
  }

  // Generate unique 3+3 char code like "ABC-123"
  const letters = randomBytes(3).toString('hex').slice(0, 3).toUpperCase()
  const digits = String(Math.floor(Math.random() * 900) + 100)
  const shareCode = `${letters}-${digits}`

  const [row] = await db
    .update(quizzes)
    .set({ shareCode, updatedAt: new Date() })
    .where(eq(quizzes.id, existing.id))
    .returning({ shareCode: quizzes.shareCode })

  return c.json({ shareCode: row!.shareCode })
})

// GET /quizzes/:id/sessions — CRM: aggregated session stats for a quiz
quizzesRoute.get('/:id/sessions', async (c) => {
  const user = c.get('user')
  const quizId = c.req.param('id')

  const [quiz] = await db
    .select({ id: quizzes.id, title: quizzes.title })
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.teacherId, user.id)))

  if (!quiz) return c.json({ error: 'Quiz not found' }, 404)

  const sessions = await db
    .select({
      id: quizSessions.id,
      playerName: quizSessions.playerName,
      score: quizSessions.score,
      isPassed: quizSessions.isPassed,
      earnedPoints: quizSessions.earnedPoints,
      totalPoints: quizSessions.totalPoints,
      startedAt: quizSessions.startedAt,
      completedAt: quizSessions.completedAt,
    })
    .from(quizSessions)
    .where(eq(quizSessions.quizId, quizId))
    .orderBy(desc(quizSessions.startedAt))

  const totalSessions = sessions.length
  const averageScore =
    totalSessions === 0
      ? 0
      : Math.round(
          sessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / totalSessions,
        )
  const passRate =
    totalSessions === 0
      ? 0
      : Math.round(
          (sessions.filter((s) => s.isPassed).length / totalSessions) * 100,
        )

  return c.json({
    quizTitle: quiz.title,
    totalSessions,
    averageScore,
    passRate,
    sessions,
  })
})
