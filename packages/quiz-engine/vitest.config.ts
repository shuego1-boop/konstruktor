import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@konstruktor/shared/schemas',
        replacement: resolve(__dirname, '../shared/src/schemas/index.ts'),
      },
      {
        find: '@konstruktor/shared/types',
        replacement: resolve(__dirname, '../shared/src/types/index.ts'),
      },
      {
        find: '@konstruktor/shared',
        replacement: resolve(__dirname, '../shared/src/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/index.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      reporter: ['text', 'json', 'html'],
    },
  },
})
