import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['packages/core/src/**/*.test.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 60,
        functions: 60,
      },
    },
  },
  resolve: {
    alias: [
      // Strip .js extension so Vite can resolve .ts source files (Node16 compat)
      { find: /^(\.{1,2}\/.+)\.js$/, replacement: '$1' },
    ],
  },
});
