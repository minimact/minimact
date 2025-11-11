import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import filesize from 'rollup-plugin-filesize';
import { visualizer } from 'rollup-plugin-visualizer';

const sharedPlugins = [
  replace({
    'process.env.NODE_ENV': JSON.stringify('production'),
    preventAssignment: true
  }),
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  typescript({ tsconfig: './tsconfig.json' }),
  filesize({
    showMinifiedSize: true,
    showGzippedSize: true
  })
];

const terserConfig = {
  compress: {
    // Aggressive compression
    arguments: true,
    booleans_as_integers: true,
    drop_console: true,        // Strip console.* in production
    drop_debugger: true,
    ecma: 2020,                // Target modern browsers
    module: true,
    passes: 3,                 // More optimization passes
    pure_funcs: ['console.log', 'console.warn', 'console.info', 'console.debug'],
    pure_getters: true,
    unsafe: true,              // Enable aggressive optimizations
    unsafe_arrows: true,
    unsafe_comps: true,
    unsafe_Function: true,
    unsafe_math: true,
    unsafe_methods: true,
    unsafe_proto: true,
    unsafe_regexp: true,
    unsafe_undefined: true
  },
  mangle: {
    properties: {
      // Mangle private properties (starting with _)
      regex: /^_/
    }
  },
  format: {
    comments: false,           // Remove all comments
    ecma: 2020
  }
};

const treeshakeConfig = {
  moduleSideEffects: false,
  propertyReadSideEffects: false,
  tryCatchDeoptimization: false
};

export default [
  // Minimact Core (SignalM - Lightweight) - 13.41 KB gzipped
  {
    input: 'src/index-core.ts',
    output: [
      {
        file: 'dist/core.js',
        format: 'iife',
        name: 'Minimact',
        sourcemap: true
      },
      {
        file: 'dist/core.min.js',
        format: 'iife',
        name: 'Minimact',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      },
      {
        file: 'dist/core.esm.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/core.esm.min.js',
        format: 'es',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      }
    ],
    plugins: [
      ...sharedPlugins,
      visualizer({
        filename: 'stats-core.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact Core (SignalM) Bundle Analysis'
      })
    ],
    treeshake: treeshakeConfig
  },

  // Minimact-R Core (SignalR - Full) - 15-16 KB gzipped
  {
    input: 'src/index-r.ts',
    output: [
      {
        file: 'dist/core-r.js',
        format: 'iife',
        name: 'Minimact',
        sourcemap: true
      },
      {
        file: 'dist/core-r.min.js',
        format: 'iife',
        name: 'Minimact',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      },
      {
        file: 'dist/core-r.esm.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/core-r.esm.min.js',
        format: 'es',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      }
    ],
    plugins: [
      ...sharedPlugins,
      visualizer({
        filename: 'stats-signalr.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact-R (SignalR) Bundle Analysis'
      })
    ],
    treeshake: treeshakeConfig
  },

  // Hot Reload Module (+3.4 KB gzipped)
  {
    input: 'src/index-hot-reload.ts',
    output: [
      {
        file: 'dist/hot-reload.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/hot-reload.min.js',
        format: 'es',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      }
    ],
    plugins: [
      ...sharedPlugins,
      visualizer({
        filename: 'stats-hot-reload.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact Hot Reload Module'
      })
    ],
    treeshake: treeshakeConfig
  },

  // Playground Module (+0.5 KB gzipped)
  {
    input: 'src/index-playground.ts',
    output: [
      {
        file: 'dist/playground.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/playground.min.js',
        format: 'es',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      }
    ],
    plugins: [
      ...sharedPlugins,
      visualizer({
        filename: 'stats-playground.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact Playground Module'
      })
    ],
    treeshake: treeshakeConfig
  },

  // Power Features Module (+5.37 KB gzipped)
  {
    input: 'src/index-power.ts',
    output: [
      {
        file: 'dist/power.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/power.min.js',
        format: 'es',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      }
    ],
    plugins: [
      ...sharedPlugins,
      visualizer({
        filename: 'stats-power.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact Power Features Module'
      })
    ],
    treeshake: treeshakeConfig
  }
];
