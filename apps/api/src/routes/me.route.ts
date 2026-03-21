import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../db/index.ts";
import { users, organizations } from "../db/schema.ts";
import { authMiddleware, type AuthContext } from "../middleware/auth.ts";

export const meRoute = new Hono<AuthContext>();

meRoute.use("*", authMiddleware);

// GET /me — current user info + org registration code + api token
meRoute.get("/", async (c) => {
  const user = c.get("user");

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      apiToken: users.apiToken,
      orgCode: organizations.registrationCode,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.id, user.id));

  if (!row) return c.json({ error: "Not found" }, 404);

  return c.json({
    name: row.name,
    email: row.email,
    orgCode: row.orgCode,
    apiToken: row.apiToken,
  });
});

// POST /me/api-key — generate (or regenerate) long-lived token for Desktop
meRoute.post("/api-key", async (c) => {
  const user = c.get("user");
  const token = randomBytes(32).toString("hex");

  await db.update(users).set({ apiToken: token }).where(eq(users.id, user.id));

  return c.json({ apiToken: token });
});

// DELETE /me/api-key — revoke token
meRoute.delete("/api-key", async (c) => {
  const user = c.get("user");

  await db.update(users).set({ apiToken: null }).where(eq(users.id, user.id));

  return c.json({ ok: true });
});
