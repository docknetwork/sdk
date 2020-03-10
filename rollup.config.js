// import resolve from 'rollup-plugin-node-resolve';
// import commonjs from 'rollup-plugin-commonjs';
// import babel from 'rollup-plugin-babel';
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
    input: 'src/dock-sdk.js',
    external: [],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
  },
];
