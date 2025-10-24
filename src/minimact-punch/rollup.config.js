import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/minimact-punch.js',
      format: 'iife',
      name: 'MinimactPunch',
      globals: {
        minimact: 'Minimact'
      }
    },
    {
      file: 'dist/minimact-punch.esm.js',
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
