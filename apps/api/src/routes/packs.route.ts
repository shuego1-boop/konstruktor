import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { quizzes } from '../db/schema.ts'

/**
 * Public pack routes — no auth required.
 * Used by the Player app to download a quiz by its share code.
 */
export const packsRoute = new Hono()

// GET /packs/by-code/:code — fetch a published quiz by share code
packsRoute.get('/by-code/:code', async (c) => {
  const code = c.req.param('code').toUpperCase().trim()

  if (!code) {
    return c.json({ error: 'Share code is required' }, 400)
  }

  const [row] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.shareCode, code), eq(quizzes.status, 'published')))

  if (!row) {
    return c.json({ error: 'Quiz not found' }, 404)
  }

  return c.json(row)
})
