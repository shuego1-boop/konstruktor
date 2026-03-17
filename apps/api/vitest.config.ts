import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@konstruktor/shared/schemas',
        replacement: resolve(__dirname, '../../packages/shared/src/schemas/index.ts'),
      },
      {
        find: '@konstruktor/shared/types',
        replacement: resolve(__dirname, '../../packages/shared/src/types/index.ts'),
      },
      {
        find: '@konstruktor/shared',
        replacement: resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reporter: ['text', 'json', 'html'],
    },
  },
})

