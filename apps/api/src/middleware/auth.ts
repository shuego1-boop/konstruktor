import type { Context, Next } from 'hono'
import type { Env } from 'hono'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth.ts'
import { db } from '../db/index.ts'
import { users } from '../db/schema.ts'

export type AuthContext = Env & {
  Variables: {
    user: { id: string; email: string; role: string; organizationId: string }
  }
}

/**
 * Middleware that validates the Better Auth session and injects `user` into context.
 * Requires a valid session cookie or Bearer token issued by Better Auth.
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Better Auth user id is text — look up the app user by email to get the correct UUID
  // (quizzes.teacherId and other FK columns reference our users table, not authUser)
  const [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))

  if (!appUser) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', {
    id: appUser.id,
    email: appUser.email,
    role: appUser.role,
    organizationId: appUser.organizationId,
  })

  await next()
}
