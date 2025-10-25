import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use happy-dom for fast DOM simulation
    environment: 'happy-dom',

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Test file patterns
    include: [
      'src/**/tests/**/*.test.ts',
      'src/**/tests/**/*.spec.ts',
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.spec.ts'
    ],

    // Coverage configuration (MES Silver requires >80%)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/tests/**',
        '**/__tests__/**'
      ],
      // MES Silver certification requirement
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },

    // Setup files
    setupFiles: ['./vitest.setup.ts'],

    // Test timeout
    testTimeout: 10000,

    // Mock reset between tests
    mockReset: true,
    clearMocks: true,
    restoreMocks: true
  },

  resolve: {
    alias: {
      '@minimact/dynamic': path.resolve(__dirname, 'src/minimact-dynamic/src'),
      '@minimact/punch': path.resolve(__dirname, 'src/minimact-punch/src'),
      '@minimact/quantum': path.resolve(__dirname, 'src/minimact-quantum/src'),
      '@minimact/query': path.resolve(__dirname, 'src/minimact-query/src'),
      '@minimact/spatial': path.resolve(__dirname, 'src/minimact-spatial/src'),
      '@minimact/trees': path.resolve(__dirname, 'src/minimact-trees/src')
    }
  }
});
