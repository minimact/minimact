/**
 * Electron-Vite Config Example for Minimact Swig
 *
 * This config shows how to use mact_modules for custom module resolution
 * in your Electron app, allowing seamless integration with locally synced packages.
 *
 * Place this file at: minimact-swig/electron.vite.config.ts
 */

import { defineConfig } from 'electron-vite';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  /**
   * Main Process Configuration
   */
  main: {
    resolve: {
      alias: {
        // Resolve @minimact/* packages from mact_modules
        '@minimact': path.resolve(__dirname, 'mact_modules/@minimact'),

        // You can also add individual aliases for fine control:
        '@minimact/babel-plugin': path.resolve(__dirname, 'mact_modules/@minimact/babel-plugin'),
        '@minimact/core': path.resolve(__dirname, 'mact_modules/@minimact/core'),
        '@minimact/punch': path.resolve(__dirname, 'mact_modules/@minimact/punch')
      }
    },

    // Build options for main process
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: [
          'electron',
          'fs',
          'path',
          'child_process',
          'chokidar'
        ]
      }
    }
  },

  /**
   * Preload Process Configuration
   */
  preload: {
    resolve: {
      alias: {
        '@minimact': path.resolve(__dirname, 'mact_modules/@minimact')
      }
    },

    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        external: ['electron']
      }
    }
  },

  /**
   * Renderer Process Configuration
   */
  renderer: {
    resolve: {
      alias: {
        '@minimact': path.resolve(__dirname, 'mact_modules/@minimact'),

        // Optional: Add other common aliases
        '@': path.resolve(__dirname, 'src/renderer/src'),
        '@components': path.resolve(__dirname, 'src/renderer/src/components'),
        '@hooks': path.resolve(__dirname, 'src/renderer/src/hooks'),
        '@utils': path.resolve(__dirname, 'src/renderer/src/utils')
      }
    },

    plugins: [
      // React plugin for JSX/TSX support
      react()
    ],

    build: {
      outDir: 'dist/renderer'
    },

    // Development server
    server: {
      port: 5173
    }
  }
});

/**
 * Alternative: Shared alias configuration
 *
 * If you want to DRY up the config:
 */

const sharedAliases = {
  '@minimact': path.resolve(__dirname, 'mact_modules/@minimact'),
  '@minimact/babel-plugin': path.resolve(__dirname, 'mact_modules/@minimact/babel-plugin'),
  '@minimact/core': path.resolve(__dirname, 'mact_modules/@minimact/core'),
  '@minimact/punch': path.resolve(__dirname, 'mact_modules/@minimact/punch')
};

export const alternativeConfig = defineConfig({
  main: {
    resolve: { alias: sharedAliases }
  },
  preload: {
    resolve: { alias: sharedAliases }
  },
  renderer: {
    resolve: { alias: sharedAliases },
    plugins: [react()]
  }
});
