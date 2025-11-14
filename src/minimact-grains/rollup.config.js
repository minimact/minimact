import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/grains.js',
      format: 'iife',
      name: 'MinimactGrains',
      globals: {
        '@minimact/core': 'Minimact',
        'react': 'React'
      }
    },
    {
      file: 'dist/grains.esm.js',
      format: 'es'
    }
  ],
  external: ['@minimact/core', 'react'],
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
