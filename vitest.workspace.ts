import { defineConfig } from 'vitest/config'

/**
 * Root-level Vitest workspace — aggregates all package test configurations.
 * Run with: bun run test  OR  turbo run test
 */
export default defineConfig({
  test: {
    workspace: [
      'packages/quiz-engine/vitest.config.ts',
      'packages/shared/vitest.config.ts',
      'packages/ui/vitest.config.ts',
      'apps/api/vitest.config.ts',
      'apps/desktop/vitest.config.ts',
      'apps/player/vitest.config.ts',
      'apps/crm/vitest.config.ts',
    ],
  },
})
