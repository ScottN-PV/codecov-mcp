import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      // TODO: Raise thresholds to 90% as test coverage expands
      thresholds: {
        statements: 15,
        branches: 15,
        functions: 13,
        lines: 15,
      },
    },
  },
})
