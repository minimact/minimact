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
    pure_funcs: [],
    drop_console: false,
    passes: 2
  }
};

const treeshakeConfig = {
  moduleSideEffects: false,
  propertyReadSideEffects: false,
  tryCatchDeoptimization: false
};

export default [
  // Test build WITHOUT hot-reload
  {
    input: 'src/index-no-hot-reload.ts',
    output: [
      {
        file: 'dist/core-test-no-hot-reload.min.js',
        format: 'iife',
        name: 'Minimact',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      }
    ],
    plugins: [
      ...sharedPlugins,
      visualizer({
        filename: 'stats-test-no-hot-reload.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact (NO HOT-RELOAD) Bundle Analysis'
      })
    ],
    treeshake: treeshakeConfig
  },
  // Test build CORE ONLY (no optional features)
  {
    input: 'src/index-core-only.ts',
    output: [
      {
        file: 'dist/core-test-minimal.min.js',
        format: 'iife',
        name: 'Minimact',
        sourcemap: true,
        plugins: [terser(terserConfig)]
      }
    ],
    plugins: [
      ...sharedPlugins,
      visualizer({
        filename: 'stats-test-core-only.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact (CORE ONLY) Bundle Analysis'
      })
    ],
    treeshake: treeshakeConfig
  }
];
