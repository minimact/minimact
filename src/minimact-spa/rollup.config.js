import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/spa.js',
      format: 'iife',
      name: 'MinimactSPA',
      globals: {
        '@minimact/core': 'Minimact'
      }
    },
    {
      file: 'dist/spa.esm.js',
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
