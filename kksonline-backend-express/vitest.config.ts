import path from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const shared = {
  globals: true,
  environment: 'node' as const,
  setupFiles: ['./tests/setup/env.ts'],
};

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'html', 'lcov'],
      include: ['src/services/**/*.ts', 'src/routes/**/*.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          ...shared,
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          testTimeout: 15_000,
        },
      },
      {
        extends: true,
        test: {
          ...shared,
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['./tests/setup/env.ts', './tests/setup/integration.setup.ts'],
          testTimeout: 15_000,
        },
      },
      {
        extends: true,
        test: {
          ...shared,
          name: 'system',
          include: ['tests/system/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
