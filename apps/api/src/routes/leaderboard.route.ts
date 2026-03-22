import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.ts";
import { quizzes, quizSessions } from "../db/schema.ts";
import {
  deviceAuthMiddleware,
  type DeviceAuthContext,
} from "../middleware/deviceAuth.ts";

export const leaderboardRoute = new Hono<DeviceAuthContext>();

// GET /quizzes/:id/leaderboard — public leaderboard for a quiz (device auth)
leaderboardRoute.get("/:id/leaderboard", deviceAuthMiddleware, async (c) => {
  const quizId = c.req.param("id");

  // Verify quiz exists
  const [quiz] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(eq(quizzes.id, quizId));

  if (!quiz) return c.json({ error: "Quiz not found" }, 404);

  const sessions = await db
    .select({
      playerName: quizSessions.playerName,
      score: quizSessions.score,
      earnedPoints: quizSessions.earnedPoints,
    })
    .from(quizSessions)
    .where(eq(quizSessions.quizId, quizId))
    .orderBy(desc(quizSessions.earnedPoints))
    .limit(20);

  return c.json(sessions);
});
