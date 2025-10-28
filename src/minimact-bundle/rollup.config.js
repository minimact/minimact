import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/minimact-bundle.js',
      format: 'iife',
      name: 'MinimactBundle',
      globals: {
        minimact: 'Minimact'
      }
    },
    {
      file: 'dist/minimact-bundle.esm.js',
      format: 'es'
    }
  ],
  external: ['minimact'],
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
