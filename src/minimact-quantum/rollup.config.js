import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/quantum.js',
      format: 'iife',
      name: 'MinimactQuantum',
      globals: {
        '@minimact/core': 'Minimact',
        '@minimact/punch': 'MinimactPunch'
      }
    },
    {
      file: 'dist/quantum.esm.js',
      format: 'es'
    }
  ],
  external: ['@minimact/core', '@minimact/punch'],
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      rootDir: './src'
    })
  ]
};
