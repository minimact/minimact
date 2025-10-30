import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/plugin.js',
      format: 'iife',
      name: 'MinimactPlugin',
      globals: {
        '@minimact/core': 'Minimact'
      }
    },
    {
      file: 'dist/plugin.esm.js',
      format: 'es'
    }
  ],
  external: ['@minimact/core'],
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
