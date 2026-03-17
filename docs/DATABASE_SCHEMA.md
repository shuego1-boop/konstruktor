# Database Schema

All tables are defined in `apps/api/src/db/schema.ts` using Drizzle ORM. This file is the **single source of truth**.

After any schema change: `bun run db:generate` → `bun run db:migrate`

---

## Entity Relationship Diagram

```
organizations ──< users ──< quizzes ──< quiz_sessions ──< question_answers
                                 │
                             devices ──< quiz_sessions
```

---

## Tables

### `organizations`
Schools and universities.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | School/university name |
| `created_at` | timestamp | |

---

### `users`
Teachers and admins. Authentication handled by Better Auth (separate `better_auth_*` tables).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `email` | text (unique) | |
| `name` | text | |
| `role` | enum: `admin`, `teacher` | |
| `organization_id` | uuid (FK → organizations) | |
| `created_at` | timestamp | |

---

### `quizzes`
Quiz definitions stored in the cloud. Questions stored as JSONB.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `teacher_id` | uuid (FK → users) | |
| `title` | text | |
| `description` | text (nullable) | |
| `subject` | text (nullable) | e.g. "Mathematics", "Biology" |
| `grade_level` | text (nullable) | e.g. "Grade 7", "University Year 1" |
| `cover_image_url` | text (nullable) | DO Spaces URL |
| `questions` | jsonb | Array of `Question` from `@konstruktor/shared` |
| `settings` | jsonb | `QuizSettings` from `@konstruktor/shared` |
| `status` | enum: `draft`, `published`, `archived` | |
| `version` | integer | Incremented on every publish |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### `devices`
Registered player devices (tablets, interactive panels).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `organization_id` | uuid (FK → organizations) | |
| `name` | text | Human-readable name: "Classroom 3 Tablet" |
| `platform` | enum: `android`, `windows` | |
| `device_token_hash` | text | Bcrypt hash of device JWT secret |
| `registered_at` | timestamp | |
| `last_seen_at` | timestamp (nullable) | Updated on each sync |

---

### `quiz_sessions`
Each student attempt at a quiz. Created during sync from player device.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Generated on device, stable across retries |
| `quiz_id` | uuid (FK → quizzes) | |
| `quiz_version` | integer | Snapshot of quiz version at play time |
| `device_id` | uuid (FK → devices, nullable) | Null if device not registered |
| `player_name` | text | Entered by student before play |
| `started_at` | timestamp | |
| `completed_at` | timestamp (nullable) | Null if session aborted |
| `score` | integer (0–100) | Percentage |
| `total_points` | integer | Max achievable points |
| `earned_points` | integer | Points the student earned |
| `is_passed` | boolean (nullable) | Null if quiz has no passing threshold |
| `streak_data` | jsonb | `StreakData` — max streak, multiplier history |
| `answers` | jsonb | Array of `QuestionAnswer` |
| `synced_at` | timestamp | When we received this from the device |

---

### `question_answers`
Normalized per-question answers for analytics queries.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `session_id` | uuid (FK → quiz_sessions) | |
| `question_id` | text | UUID of the question inside the quiz JSONB |
| `answer` | jsonb | The student's raw answer (varies by question type) |
| `is_correct` | boolean | |
| `points_earned` | integer | |
| `response_time_ms` | integer | Time from question shown to answer submitted |
| `attempted_at` | timestamp | |

---

## Indexes

```sql
-- Most common query: teacher fetching their own quizzes
CREATE INDEX idx_quizzes_teacher_id ON quizzes(teacher_id);

-- CRM: sessions for a specific quiz
CREATE INDEX idx_sessions_quiz_id ON quiz_sessions(quiz_id);

-- Analytics: answers per session
CREATE INDEX idx_answers_session_id ON question_answers(session_id);

-- Analytics: all answers for a specific question across sessions
CREATE INDEX idx_answers_question_id ON question_answers(question_id);
```

---

## Drizzle Schema Snippet

```typescript
// apps/api/src/db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher'])
export const devicePlatformEnum = pgEnum('device_platform', ['android', 'windows'])
export const quizStatusEnum = pgEnum('quiz_status', ['draft', 'published', 'archived'])

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  questions: jsonb('questions').notNull().$type<Question[]>().default([]),
  settings: jsonb('settings').notNull().$type<QuizSettings>(),
  status: quizStatusEnum('status').notNull().default('draft'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```
