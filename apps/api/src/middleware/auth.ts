import type { Context, Next } from "hono";
import type { Env } from "hono";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.ts";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";

export type AuthContext = Env & {
  Variables: {
    user: { id: string; email: string; role: string; organizationId: string };
  };
};

/**
 * Middleware that validates the request and injects `user` into context.
 *
 * Accepts two auth mechanisms:
 *  1. Better Auth session cookie (CRM web app)
 *  2. `Authorization: Bearer <apiToken>` header (Desktop app)
 */
export async function authMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  // ── 1. Better Auth session (cookie) ──────────────────────────────────────
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    const [appUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email));

    if (appUser) {
      c.set("user", {
        id: appUser.id,
        email: appUser.email,
        role: appUser.role,
        organizationId: appUser.organizationId,
      });
      await next();
      return;
    }
  }

  // ── 2. Bearer API token (Desktop integration) ─────────────────────────────
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      const [appUser] = await db
        .select()
        .from(users)
        .where(eq(users.apiToken, token));

      if (appUser) {
        c.set("user", {
          id: appUser.id,
          email: appUser.email,
          role: appUser.role,
          organizationId: appUser.organizationId,
        });
        await next();
        return;
      }
    }
  }

  return c.json({ error: "Unauthorized" }, 401);
}
