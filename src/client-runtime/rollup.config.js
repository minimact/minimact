import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import filesize from 'rollup-plugin-filesize';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/minimact.js',
      format: 'iife',
      name: 'Minimact',
      sourcemap: true
    },
    {
      file: 'dist/minimact.min.js',
      format: 'iife',
      name: 'Minimact',
      sourcemap: true,
      plugins: [terser({
        compress: {
          pure_funcs: ['console.log'],
          drop_console: false, // Keep console.error/warn
          passes: 2
        }
      })]
    },
    {
      file: 'dist/minimact.esm.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/minimact.esm.min.js',
      format: 'es',
      sourcemap: true,
      plugins: [terser({
        compress: {
          pure_funcs: ['console.log'],
          drop_console: false,
          passes: 2
        }
      })]
    }
  ],
  plugins: [
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
    }),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ],
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  }
};
