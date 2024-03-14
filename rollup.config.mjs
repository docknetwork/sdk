import json from '@rollup/plugin-json';
import multiInput from 'rollup-plugin-multi-input';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
// import { wasm } from '@rollup/plugin-wasm';
// import pkg from './package.json';

export default async function() {
  return [{
    plugins: [
      multiInput.default(),
      json(),
      terser(),
      commonjs(),
      // Temporarily disabled, not sure if required
      // since rify is a node module doesnt seem to work
      // but would be nice to try embed it
      // wasm({
      //   sync: ['*.wasm'],
      // }),
    ],
    input: ['src/**/*.js'],
    output: [
      {
        dir: 'dist',
        format: 'esm',
        entryFileNames: '[name].js'
      },
      {
        dir: 'dist',
        format: 'cjs',
        entryFileNames: '[name].cjs'
      }
    ]
  }];
};
