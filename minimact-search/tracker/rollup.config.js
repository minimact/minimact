import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/tracker.ts',
  output: [
    {
      file: 'dist/tracker.js',
      format: 'umd',
      name: 'MacticTracker',
      sourcemap: true
    },
    {
      file: 'dist/tracker.min.js',
      format: 'umd',
      name: 'MacticTracker',
      sourcemap: true,
      plugins: [terser()]
    }
  ],
  plugins: [
    nodeResolve(),
    typescript()
  ]
};
