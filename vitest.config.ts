import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        "src/**/*.ts": { branches: 85 }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
