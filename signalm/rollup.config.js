import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

export default [
  // UMD build (for <script> tags)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/signalm.js',
      format: 'umd',
      name: 'SignalM',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: './src'
      })
    ]
  },

  // UMD minified build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/signalm.min.js',
      format: 'umd',
      name: 'SignalM',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json'
      }),
      terser({
        compress: {
          passes: 3,
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true
        },
        mangle: {
          properties: {
            regex: /^_/
          }
        }
      })
    ]
  },

  // ESM build (for import)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/signalm.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json'
      })
    ]
  }
];
