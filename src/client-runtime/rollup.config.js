import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

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
      file: 'dist/minimact.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json' })
  ]
};
