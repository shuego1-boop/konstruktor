import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'
import type { Question, QuizSettings, QuizSession, StreakData } from '@konstruktor/shared'

// ─── Enums ─────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher'])
export const devicePlatformEnum = pgEnum('device_platform', ['android', 'windows'])
export const quizStatusEnum = pgEnum('quiz_status', ['draft', 'published', 'archived'])

// ─── Tables ────────────────────────────────────────────────────────────────

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** Short code used for device registration, e.g. "ORG-ABC123" */
  registrationCode: text('registration_code').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('teacher'),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  subject: text('subject'),
  gradeLevel: text('grade_level'),
  coverImageUrl: text('cover_image_url'),
  /** Short alphanumeric share code for player download, e.g. "ABC-123" */
  shareCode: text('share_code').unique(),
  questions: jsonb('questions').notNull().$type<Question[]>().default([]),
  settings: jsonb('settings').notNull().$type<QuizSettings>(),
  status: quizStatusEnum('status').notNull().default('draft'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  name: text('name').notNull(),
  platform: devicePlatformEnum('platform').notNull(),
  /** bcrypt hash of the device JWT secret */
  deviceTokenHash: text('device_token_hash').notNull(),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at'),
})

export const quizSessions = pgTable('quiz_sessions', {
  /** UUID generated on the device — stable across sync retries */
  id: uuid('id').primaryKey(),
  quizId: uuid('quiz_id')
    .references(() => quizzes.id)
    .notNull(),
  quizVersion: integer('quiz_version').notNull(),
  deviceId: uuid('device_id').references(() => devices.id),
  playerName: text('player_name').notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  /** 0–100 percentage */
  score: integer('score'),
  totalPoints: integer('total_points').notNull(),
  earnedPoints: integer('earned_points').notNull().default(0),
  isPassed: boolean('is_passed'),
  streakData: jsonb('streak_data').$type<StreakData>(),
  /** Denormalized answers — also stored normalized in question_answers for queries */
  answers: jsonb('answers').notNull().$type<QuizSession['answers']>().default([]),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
})

export const questionAnswers = pgTable('question_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => quizSessions.id)
    .notNull(),
  questionId: text('question_id').notNull(),
  answer: jsonb('answer').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  pointsEarned: integer('points_earned').notNull(),
  responseTimeMs: integer('response_time_ms').notNull(),
  attemptedAt: timestamp('attempted_at').notNull(),
})

// ─── Better Auth tables ─────────────────────────────────────────────────────
// Required by Better Auth's Drizzle adapter — must match these exact names

export const authUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const authSession = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
})

export const authAccount = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const authVerification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Types inferred from schema ────────────────────────────────────────────

export type OrgRow = typeof organizations.$inferSelect
export type UserRow = typeof users.$inferSelect
export type QuizRow = typeof quizzes.$inferSelect
export type DeviceRow = typeof devices.$inferSelect
export type SessionRow = typeof quizSessions.$inferSelect
export type QuestionAnswerRow = typeof questionAnswers.$inferSelect
