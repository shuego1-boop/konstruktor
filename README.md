# Konstruktor

> Educational quiz builder for schools and universities.

---

## What it does

A teacher installs the **Desktop Creator** on Windows, builds a quiz with a drag-and-drop editor, exports a `.pack` file (JSON bundle + assets), and distributes it to tablets or interactive panels running the **Player App**. Results sync to the cloud when a network is available, and the teacher reviews detailed per-student analytics in the **CRM dashboard**.

---

## Apps

| App | Platform | Description |
|---|---|---|
| `apps/desktop` | Windows EXE (Tauri) | Quiz builder — create, preview, export |
| `apps/player` | Android APK + Windows EXE (Capacitor) | Student quiz player, offline-first |
| `apps/crm` | Web SPA (React) | Teacher analytics dashboard |
| `apps/api` | Server (Hono + Bun) | REST API, auth, sync, storage |

## Shared Packages

| Package | Description |
|---|---|
| `packages/shared` | TypeScript types + Zod schemas (single source of truth) |
| `packages/quiz-engine` | Pure TS quiz state machine, scoring, timer |
| `packages/ui` | Shared React UI components |

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.1
- [Docker](https://docker.com) (for local Postgres)
- [Rust](https://rustup.rs) (for Tauri desktop build)
- [Android Studio](https://developer.android.com/studio) (for APK build)

### Install & run

```bash
# 1. Clone
git clone https://github.com/your-org/konstruktor.git
cd konstruktor

# 2. Install all dependencies
bun install

# 3. Start Postgres
docker compose up postgres -d

# 4. Copy env and configure
cp .env.example .env

# 5. Run DB migrations
bun run db:migrate

# 6. Start everything in dev mode
bun run dev
```

### Run specific apps

```bash
# API only
turbo run dev --filter=api

# CRM web
turbo run dev --filter=crm

# Desktop (requires Rust)
turbo run dev --filter=desktop

# Player
turbo run dev --filter=player
```

---

## Testing

```bash
# All tests
bun run test

# With coverage
bun run test:coverage

# Specific package
turbo run test --filter=quiz-engine

# E2E (Playwright)
bunx playwright test
```

---

## Build

```bash
# Build all packages
bun run build

# Build Desktop EXE
turbo run build --filter=desktop

# Build Android APK
cd apps/player && bunx cap sync android && cd android && ./gradlew assembleRelease

# Build Windows EXE via Capacitor
cd apps/player && bunx cap sync @capacitor-community/electron
```

---

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Tech Stack](docs/TECH_STACK.md)
- [TDD Approach](docs/TDD_APPROACH.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [API Spec](docs/API_SPEC.md)
- [Responsive Design](docs/RESPONSIVE_DESIGN.md)
