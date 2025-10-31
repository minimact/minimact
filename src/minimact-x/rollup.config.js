import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/x.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/x.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist'
    })
  ],
  external: ['@minimact/core']
};
