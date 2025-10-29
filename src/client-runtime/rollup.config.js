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
    pure_funcs: ['console.log'],
    drop_console: false, // Keep console.error/warn
    passes: 2
  }
};

const treeshakeConfig = {
  moduleSideEffects: false,
  propertyReadSideEffects: false,
  tryCatchDeoptimization: false
};

export default [
  // Minimact (SignalM - Lightweight)
  {
    input: 'src/index.ts',
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
        filename: 'stats-signalm.html',
        gzipSize: true,
        brotliSize: true,
        title: 'Minimact (SignalM) Bundle Analysis'
      })
    ],
    treeshake: treeshakeConfig
  },

  // Minimact-R (SignalR - Full)
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
  }
];
