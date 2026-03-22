import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.ts";
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
} from "../db/schema.ts";

/**
 * Better Auth instance — used by authMiddleware and mounted at /auth/* in index.ts.
 */
const secret = process.env["BETTER_AUTH_SECRET"];
if (!secret) throw new Error("BETTER_AUTH_SECRET env variable is required");

export const auth = betterAuth({
  basePath: "/auth",
  baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
  secret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // In production, send an email. For demo, log to console.
      console.log(`[Password Reset] ${user.email} → ${url}`);
    },
  },
  trustedOrigins: [
    "http://127.0.0.1:5175",
    "http://localhost:5175",
    "tauri://localhost",
    ...(process.env["TRUSTED_ORIGINS"] ?? "").split(",").filter(Boolean),
  ],
});
