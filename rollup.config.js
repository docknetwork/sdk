// import resolve from 'rollup-plugin-node-resolve';
// import commonjs from 'rollup-plugin-commonjs';
// import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';
import pkg from './package.json';


export default [
  // {
  //   input: 'src/umd.js',
  //   output: {
  //     name: 'index',
  //     file: pkg.browser,
  //     format: 'umd',
  //   },
  //   plugins: [
  //     resolve(),
  //     commonjs(),
  //     babel({
  //       exclude: 'node_modules/**',
  //     }),
  //   ],
  // },
  {
    plugins: [
      json(),
    ],
    input: 'src/api.js',
    external: [],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
  },
];
