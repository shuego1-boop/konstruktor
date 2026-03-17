# Architecture

## Overview

Konstruktor is built as a **monorepo** (Turborepo + Bun workspaces) with four apps and three shared packages. The core design principle is **offline-first**: quizzes run entirely without internet and sync to the cloud when connectivity is available.

---

## System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  TEACHER WORKFLOW                                                     │
│                                                                       │
│  ┌────────────────────┐        ┌────────────────────────────────┐    │
│  │  apps/desktop      │        │  Cloud (DO App Platform)       │    │
│  │  Windows EXE       │──────▶ │  apps/api (Hono + Bun)         │    │
│  │  Tauri + React     │  sync  │  DO Managed Postgres           │    │
│  │                    │◀────── │  DO Spaces (files)             │    │
│  │  Create quizzes    │        └────────────┬───────────────────┘    │
│  │  Preview locally   │                     │                        │
│  │  Export .pack      │                     │ sync results up        │
│  └───────┬────────────┘                     │                        │
│           │ .pack file                       │                        │
│           │ (USB / Wi-Fi / cloud)            │                        │
│           ▼                                  ▼                        │
│  ┌────────────────────┐        ┌────────────────────────────────┐    │
│  │  apps/player       │        │  apps/crm                      │    │
│  │  Android APK       │──────▶ │  React Web SPA                 │    │
│  │  Windows EXE       │ sync   │                                │    │
│  │  Capacitor         │        │  Per-student analytics         │    │
│  │                    │        │  Question heatmap              │    │
│  │  Offline-first     │        │  Export CSV                    │    │
│  │  Results in IDB    │        └────────────────────────────────┘    │
│  └────────────────────┘                                              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Quiz Creation (Desktop → Player)

1. Teacher builds quiz in `apps/desktop` (locally, no network needed)
2. Quiz saved as `quiz.json` in local SQLite
3. Teacher clicks **Export** → produces `<title>.pack` (ZIP: `quiz.json` + image/audio assets)
4. Pack transferred to player device via:
   - **Option A**: Local Wi-Fi — Desktop starts HTTP server on LAN, Player scans QR
   - **Option B**: USB file transfer to `Documents/Konstruktor/packs/`
   - **Option C**: Teacher uploads to cloud via Desktop → Player downloads by code

### Quiz Playthrough (Player → Cloud)

1. Student opens Pack in Player, enters name
2. `packages/quiz-engine` drives the entire session (state machine)  
3. On completion, result saved to IndexedDB
4. Background sync sends result to `apps/api` when internet available

### Teacher Views Results (Cloud → CRM)

1. Teacher logs into `apps/crm` (web browser)
2. CRM fetches sessions from `apps/api`
3. Displays per-student breakdown, question-level heatmap, export

---

## Package Dependency Graph

```
apps/desktop ──────────────────────────────┐
apps/player  ──────────┐                   │
apps/crm ──────────────┤──▶ packages/ui    │
                        │         │        │
                        └─────────┴───▶ packages/shared
                                              ▲
apps/api ─────────────────────────────────────┘
packages/quiz-engine ──────────────────────────▶ packages/shared
apps/desktop ──────────────────────────────────▶ packages/quiz-engine
apps/player ────────────────────────────────────▶ packages/quiz-engine
```

`packages/quiz-engine` has **zero UI dependencies** — it is pure TypeScript logic usable in Node, browser, and any runtime.

---

## Key Architectural Decisions

### 1. Universal Player App (not per-quiz APK)
One APK installed once. Quizzes are data files (`.pack`), not code. This eliminates the need for Android SDK on teacher machines and avoids APK signing hell.

### 2. Offline-first Player
Player works with zero internet: quiz engine, rendering, and result storage all run locally. Authentication is device-level (registered once with a token). Results queue in IndexedDB and sync when connectivity is restored.

### 3. Shared Quiz Engine
`packages/quiz-engine` implements the state machine, scoring, timer, and answer evaluation for ALL question types. Used by:
- `apps/desktop` — for real-time preview while building
- `apps/player` — for actual playback

One implementation = zero divergence between preview and production.

### 4. `.pack` Format
A quiz pack is a standard ZIP file renamed `.pack`:
```
quiz.pack/
├── quiz.json       ← Quiz definition (types from @konstruktor/shared)
├── assets/
│   ├── images/
│   │   ├── cover.webp
│   │   └── q2-diagram.webp
│   └── audio/
│       └── q5-sound.mp3
└── manifest.json   ← version, checksum, created_at
```

### 5. Turborepo build caching
All `build`, `test`, and `type-check` tasks are cached. Only changed packages rebuild. On a clean repo: ~2 min full build. After a single file change: ~5s.

---

## Deployment (Digital Ocean)

```
DO App Platform
├── api service    ─ Docker container (oven/bun image)
└── crm service    ─ Static site (built React SPA)

DO Managed Postgres  ─ Database
DO Spaces            ─ File storage (images, audio assets)
DO Container Registry ─ Docker images
```
