import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/query.js',
      format: 'iife',
      name: 'MinimactQuery',
      globals: {
        '@minimact/punch': 'MinimactPunch'
      }
    },
    {
      file: 'dist/query.esm.js',
      format: 'es'
    }
  ],
  external: ['@minimact/punch'],
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
