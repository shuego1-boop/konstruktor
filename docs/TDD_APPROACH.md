# TDD Approach

Konstruktor follows **Test-Driven Development (TDD)** for all logic code. The cycle is:

```
Red → Green → Refactor
```

1. **Red** — Write a failing test that precisely describes the desired behavior
2. **Green** — Write the *minimum* code to make the test pass — nothing more
3. **Refactor** — Improve the implementation while keeping all tests green

---

## Rules

- **Never create an implementation file without a test file first**
- Tests are written before the code they test
- Each test must fail for the right reason before implementation
- Implementation must not contain logic not covered by a test
- Coverage target: **≥80%** for all packages; **100%** for `packages/quiz-engine`

---

## Test File Locations

```
packages/quiz-engine/
├── src/
│   ├── engine.ts          ← implementation (written AFTER tests)
│   ├── scoring.ts
│   └── timer.ts
└── tests/
    ├── engine.test.ts     ← written FIRST
    ├── scoring.test.ts
    └── timer.test.ts

apps/api/
├── src/
│   └── routes/
│       └── quizzes.route.ts
└── tests/
    └── quizzes.test.ts

apps/crm/
└── src/
    └── components/
        ├── ResultsTable.tsx
        └── ResultsTable.test.tsx   ← co-located with component
```

---

## Running Tests

```bash
# All tests in the monorepo
bun run test

# Specific package
turbo run test --filter=quiz-engine
turbo run test --filter=api

# With coverage
bun run test:coverage

# Watch mode
turbo run test --filter=quiz-engine -- --watch

# Vitest UI (browser interface)
turbo run test --filter=quiz-engine -- --ui
```

---

## Test Naming Conventions

Use `describe` / `it` blocks with **"it should..."** style names:

```typescript
describe('QuizEngine', () => {
  describe('submitAnswer()', () => {
    it('should mark the answer as correct when the option matches correctOptionId', () => {
      // ...
    })

    it('should award zero points for a wrong answer', () => {
      // ...
    })

    it('should throw when called outside of question state', () => {
      // ...
    })
  })
})
```

---

## What to Test

### Unit tests (packages/quiz-engine, packages/shared)
- Pure functions: every input → output combination that matters
- State machines: every valid transition
- Edge cases: empty input, boundary values, invalid state transitions

### Integration tests (apps/api)
- HTTP routes: use Hono's `testClient` — not real network requests
- Database: use a real test DB (separate schema or transactions that roll back)
- Auth middleware: test with valid and invalid tokens

### Component tests (apps/crm, apps/desktop, apps/player)
- Render without crashing
- User interactions produce expected state changes
- Accessibility: correct roles and ARIA attributes

### E2E tests (Playwright)
- Critical user flows only: create quiz, export pack, view results
- Run against real built app, not mocks

---

## Vitest Configuration

Each package with tests has its own `vitest.config.ts`:

```typescript
// packages/quiz-engine/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',        // 'happy-dom' for React component tests
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 100,             // 80 for other packages
        functions: 100,
        branches: 100,
        statements: 100,
      },
      reporter: ['text', 'json', 'html'],
      exclude: ['tests/**', '*.config.ts'],
    },
  },
})
```

---

## API Test Pattern (Hono testClient)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testClient } from 'hono/testing'
import { app } from '../src/index'

describe('POST /quizzes', () => {
  it('should return 401 when not authenticated', async () => {
    const client = testClient(app)
    const res = await client.quizzes.$post({ json: { title: 'Test' } })
    expect(res.status).toBe(401)
  })

  it('should create a quiz and return 201', async () => {
    // ...with auth token
  })
})
```

---

## Component Test Pattern

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TimerBar } from './TimerBar'

describe('TimerBar', () => {
  it('should display 100% width when percent is 1', () => {
    render(<TimerBar percent={1} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveStyle({ width: '100%' })
  })

  it('should call onExpire when percent reaches 0', async () => {
    const onExpire = vi.fn()
    render(<TimerBar percent={0} onExpire={onExpire} />)
    expect(onExpire).toHaveBeenCalledOnce()
  })
})
```
