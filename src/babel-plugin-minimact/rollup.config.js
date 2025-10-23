import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'index-full.cjs',
  output: [
    {
      file: 'dist/minimact-babel-plugin.js',
      format: 'umd',
      name: 'MinimactBabelPlugin',
      globals: {
        '@babel/core': 'Babel',
        '@babel/types': 'BabelTypes'
      },
      sourcemap: true
    },
    {
      file: 'dist/minimact-babel-plugin.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  external: ['@babel/core', '@babel/types'],
  plugins: [
    resolve({
      preferBuiltins: false,
      browser: true
    }),
    commonjs({
      sourceMap: true
    }),
    json()
  ]
};
