# Konstruktor — GitHub Copilot Workspace Instructions

## Project Overview

Konstruktor is an **educational quiz builder** platform for schools and universities.

- **Desktop app** (Windows, Tauri): Teachers design quizzes with a drag-and-drop editor
- **Player app** (Android APK + Windows EXE, Capacitor): Students take quizzes on tablets and interactive panels — works offline
- **CRM web** (React SPA): Teachers view detailed results, analytics, per-student breakdowns
- **API** (Hono + Bun + Postgres): Cloud sync, auth, storage

---

## Monorepo Structure

```
konstruktor/
├── apps/
│   ├── api/        — Hono + Bun REST API (cloud)
│   ├── crm/        — React web CRM for teachers
│   ├── desktop/    — Tauri quiz builder (Windows)
│   └── player/     — Capacitor quiz player (Android + Windows)
├── packages/
│   ├── shared/     — TypeScript types + Zod schemas (source of truth)
│   ├── quiz-engine/ — Pure TS quiz logic (state machine, scoring, timer)
│   └── ui/         — Shared React components (Button, Timer, Card, etc.)
```

---

## Development Approach: Test-Driven Development (TDD)

**ALWAYS write tests BEFORE implementation.** Red → Green → Refactor cycle:
1. **Red** — Write a failing test describing the desired behaviour
2. **Green** — Write the minimal code to make it pass
3. **Refactor** — Improve code quality while keeping tests green

**Rules:**
- Never create a `.ts`/`.tsx` implementation file without a corresponding `.test.ts` file
- Test files live in `tests/` subdirectories or as `*.test.ts` siblings
- Coverage target: **≥ 80%** for all `packages/`
- `quiz-engine` must have **100% coverage** — it has no UI dependencies

---

## Testing Stack

| Scope | Tool |
|---|---|
| Unit / integration (TS) | Vitest |
| React components | @testing-library/react + Vitest |
| E2E (web) | Playwright |
| E2E (desktop) | Playwright via Tauri WebDriver |

---

## Code Conventions

### TypeScript
- **Strict mode always** — `strict: true`, `noUncheckedIndexedAccess: true`
- No `any` — use `unknown` and narrow with type guards
- No `as` casts except with an inline comment explaining why it is safe
- Prefer `type` over `interface` unless you need declaration merging
- Use `satisfies` operator to validate object literals against types

### Error Handling
- Use `Result<T, E>` pattern in `quiz-engine` — never throw for expected errors
- API routes: use Hono's `c.json({ error: '...' }, 400)` pattern
- Always validate external input with Zod before processing

### Imports
- All shared types come from `@konstruktor/shared` — never duplicate
- All Zod schemas come from `@konstruktor/shared/schemas`
- Use absolute imports via workspace packages, not relative `../../` hacks

### File Naming
- React components: `PascalCase.tsx`
- Utilities / hooks / services: `camelCase.ts`
- Test files: `*.test.ts` / `*.test.tsx`
- Route files: `camelCase.route.ts`
- Schema / migration files: `snake_case`

### Database
- **All queries through Drizzle ORM** — no raw SQL strings
- Schema is the single source of truth in `apps/api/src/db/schema.ts`
- Run `bun run db:generate` after every schema change

---

## Responsive Design Rules

Quiz player and constructor must work at all resolutions:

| Context | Resolution | Notes |
|---|---|---|
| Tablet portrait | 768×1024 | Most common student device |
| Tablet landscape | 1024×768 | Also common |
| Interactive panel | 1920×1080–3840×2160 | Large touch screen |
| Desktop | 1280×800+ | Teacher desktop/laptop |

**Rules:**
- Never use fixed pixel widths on quiz cards or question containers
- Use `clamp()` for font sizes: `font-size: clamp(1rem, 2.5vw, 2rem)`
- Minimum touch target size: **44×44px**
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- Use CSS container queries (`@container`) for nested component responsiveness
- Framer Motion animations must respect `prefers-reduced-motion`

---

## Security Rules

- Validate ALL user input with Zod at API boundaries
- No secrets in frontend code — use `VITE_` prefixed env vars only for public values
- File uploads: generate pre-signed DO Spaces URLs, never pipe files through API
- Device sync tokens: short-lived JWTs (24h), stored in secure storage
- Auth: Better Auth handles sessions — never roll custom auth logic
- SQL: Drizzle ORM only — prevents SQL injection by design

---

## Key API Patterns

### Route with validation:
```typescript
import { zValidator } from '@hono/zod-validator'
import { createQuizSchema } from '@konstruktor/shared/schemas'

app.post('/quizzes', authMiddleware, zValidator('json', createQuizSchema), async (c) => {
  const data = c.req.valid('json') // fully typed
  // ...
})
```

### Drizzle query:
```typescript
const result = await db
  .select()
  .from(quizzes)
  .where(and(eq(quizzes.teacherId, userId), eq(quizzes.status, 'published')))
  .orderBy(desc(quizzes.createdAt))
```

### Result type (quiz-engine):
```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }
```

---

## MCP Servers Available

| Server | Purpose |
|---|---|
| `figma` | Read Figma designs and extract tokens/components |
| `playwright` | Run and write E2E tests |
| `magic` | Generate UI components from 21st.dev library |
| `postgres` | Explore and query the database directly |
| `filesystem` | Read/write project files |
