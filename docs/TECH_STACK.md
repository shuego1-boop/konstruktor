# Tech Stack

Complete dependency list with versions, rationale, and usage scope.

---

## Runtime & Tooling

| Tool | Version | Scope | Why |
|---|---|---|---|
| **Bun** | ≥1.1 | All | Runtime + package manager + bundler. 3–10× faster installs/coldstart than Node+npm |
| **Turborepo** | ^2.3 | Monorepo | Task orchestration with remote caching. Understands dependency graph |
| **TypeScript** | ^5.7 | All | Strict mode everywhere. `noUncheckedIndexedAccess` catches silent bugs |
| **Prettier** | ^3.4 | All | Zero-config formatter. No debates |

---

## Backend — `apps/api`

| Package | Version | Why |
|---|---|---|
| **hono** | ^4.7 | Ultra-light framework (~14KB). First-class TypeScript, works on Bun natively |
| **@hono/zod-validator** | ^0.4 | Middleware for validated, typed request bodies |
| **drizzle-orm** | ^0.40 | TypeScript-first ORM. SQL-like syntax, no magic. Works great with Bun |
| **drizzle-kit** | ^0.30 | CLI for migrations and schema introspection |
| **postgres** | ^3.4 | Postgres driver for Drizzle (fastest pure-JS driver) |
| **better-auth** | ^1.2 | Auth with session management, roles, OAuth. Works with Hono |
| **zod** | ^3.24 | Schema validation — shared with frontend via `@konstruktor/shared` |
| **@aws-sdk/client-s3** | ^3.x | DO Spaces is S3-compatible — pre-signed URL generation |
| **vitest** | ^3.0 | Test runner |
| **@vitest/coverage-v8** | ^3.0 | Coverage reports |

---

## Frontend — `apps/crm`, `apps/desktop`, `apps/player`

| Package | Version | Why |
|---|---|---|
| **react** | ^19.0 | UI library |
| **react-dom** | ^19.0 | DOM renderer |
| **vite** | ^6.0 | Build tool. Fast HMR, small bundles |
| **@vitejs/plugin-react** | ^4.3 | React support for Vite |
| **framer-motion** | ^12.0 | Declarative animations. Timer pulse, confetti, slide transitions |
| **tailwindcss** | ^3.4 | Utility-first CSS. Responsive prefixes, container queries |
| **@tanstack/react-query** | ^5.0 | Server state + caching for CRM data fetching |
| **@tanstack/react-table** | ^8.0 | Headless table for results grid |
| **recharts** | ^2.14 | Charts for analytics (score distribution, progress over time) |
| **howler** | ^2.2 | Lightweight audio. Sound effects on correct/wrong answers |
| **idb** | ^8.0 | IndexedDB wrapper for offline result storage in Player |
| **class-variance-authority** | ^0.7 | Type-safe component variants |
| **clsx** | ^2.1 | Conditional className merging |
| **tailwind-merge** | ^2.5 | Merge Tailwind classes without conflicts |

---

## Desktop — `apps/desktop`

| Package | Version | Why |
|---|---|---|
| **@tauri-apps/api** | ^2.2 | Tauri JS/TS bridge — file system, dialogs, OS integration |
| **@tauri-apps/cli** | ^2.2 | Tauri CLI for dev and build |
| **@tauri-apps/plugin-fs** | ^2.x | File system access (save/load .pack files) |
| **@tauri-apps/plugin-dialog** | ^2.x | Native open/save dialogs |
| **@tauri-apps/plugin-shell** | ^2.x | Shell commands |
| **@dnd-kit/core** | ^6.2 | Accessible drag-and-drop for quiz question builder |
| **@dnd-kit/sortable** | ^8.0 | Sortable list for question reordering |

**Rust crates (src-tauri/Cargo.toml):**

| Crate | Why |
|---|---|
| `tauri` v2 | Desktop shell |
| `tauri-build` v2 | Build script |
| `tauri-plugin-shell` v2 | Shell access |
| `serde` / `serde_json` | JSON serialization for Tauri commands |
| `zip` | Creating `.pack` export files |

---

## Player — `apps/player`

| Package | Version | Why |
|---|---|---|
| **@capacitor/core** | ^7.0 | Capacitor core — wraps web app for native |
| **@capacitor/cli** | ^7.0 | Build & sync CLI |
| **@capacitor/android** | ^7.0 | Android target |
| **@capacitor/filesystem** | ^7.0 | Read `.pack` files from device storage |
| **@capacitor/preferences** | ^7.0 | Secure key-value store for device token |
| **@capacitor/network** | ^7.0 | Online/offline detection for sync |
| **@capacitor/haptics** | ^7.0 | Vibration feedback on correct/incorrect answers |

---

## Shared Packages

### `packages/shared`

| Package | Why |
|---|---|
| **zod** | ^3.24 | All type schemas defined here — single source of truth |
| **typescript** | ^5.7 | Types only, no runtime |

### `packages/quiz-engine`

| Package | Why |
|---|---|
| **vitest** | ^3.0 | Unit tests — 100% coverage target |
| **@vitest/coverage-v8** | ^3.0 | Track coverage |

### `packages/ui`

| Package | Why |
|---|---|
| **react** | ^19.0 | Peer dependency |
| **framer-motion** | ^12.0 | Animation primitives |
| **tailwindcss** | ^3.4 | Styling |
| **@radix-ui/react-\*** | ^2.x | Accessible headless primitives (Dialog, Tooltip, etc.) |

---

## Dev / Testing

| Tool | Version | Why |
|---|---|---|
| **vitest** | ^3.0 | Fast Vite-native test runner |
| **@testing-library/react** | ^16.0 | Component tests — query by role, not implementation |
| **@testing-library/user-event** | ^14.0 | Realistic user interaction simulation |
| **@playwright/test** | ^1.50 | E2E tests (CRM web + Desktop via WebDriver) |
| **@vitest/coverage-v8** | ^3.0 | V8-based coverage (no Babel needed with Bun) |
| **happy-dom** | ^16.0 | Lightweight DOM for Vitest (faster than jsdom) |

---

## MCP Servers (AI Development Tools)

Configured in `.vscode/mcp.json`. Used by GitHub Copilot during development.

| Server | Package | Purpose |
|---|---|---|
| **figma** | `figma-developer-mcp` | Read Figma designs, extract color tokens and component specs |
| **playwright** | `@playwright/mcp` | Write and run E2E tests via natural language |
| **magic** | `@21st-dev/magic` | Generate polished UI components from 21st.dev library |
| **postgres** | `@modelcontextprotocol/server-postgres` | Query live DB, inspect schema, debug data issues |
| **filesystem** | `@modelcontextprotocol/server-filesystem` | Read/write project files from AI context |
