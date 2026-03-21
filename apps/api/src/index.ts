import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { quizzesRoute } from "./routes/quizzes.route.ts";
import { sessionsRoute } from "./routes/sessions.route.ts";
import { uploadsRoute } from "./routes/uploads.route.ts";
import { devicesRoute } from "./routes/devices.route.ts";
import { packsRoute } from "./routes/packs.route.ts";
import { meRoute } from "./routes/me.route.ts";
import { auth } from "./lib/auth.ts";

const app = new Hono();

// ─── Middleware ─────────────────────────────────────────────────────────────

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: [
      process.env["VITE_APP_URL"] ?? "http://localhost:5175",
      "http://localhost:5175",
      "http://127.0.0.1:5175",
      "tauri://localhost",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);

// ─── Auth handler (Better Auth) ─────────────────────────────────────────────
// Handles /auth/sign-in, /auth/sign-up, /auth/sign-out, /auth/session, etc.

app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.route("/quizzes", quizzesRoute);
app.route("/sessions", sessionsRoute);
app.route("/uploads", uploadsRoute);
app.route("/devices", devicesRoute);
app.route("/packs", packsRoute);
app.route("/me", meRoute);

// ─── Health check ────────────────────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── 404 fallthrough ─────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// ─── Bun server ──────────────────────────────────────────────────────────────

export default {
  port: Number(process.env["PORT"] ?? 3000),
  fetch: app.fetch,
};

export { app };
