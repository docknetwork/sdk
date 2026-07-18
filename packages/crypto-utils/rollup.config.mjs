import path from 'node:path';
import { fileURLToPath } from 'node:url';

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import multiInput from 'rollup-plugin-multi-input';

const sep = path.sep;
const packageRoot = path.normalize(path.dirname(fileURLToPath(import.meta.url)));

function isExternal(id) {
  if (id.startsWith('\0')) return false;
  if (id.startsWith('.') || id.startsWith(`src${sep}`) || id.startsWith('src/')) {
    return false;
  }
  if (path.isAbsolute(id)) {
    const normalized = path.normalize(id);
    if (normalized.startsWith(packageRoot)) return false;
    return id.includes(`${sep}node_modules${sep}`);
  }
  return true;
}

export default [{
  input: ['src/**/*.js'],
  external: isExternal,
  plugins: [
    multiInput(),
    nodeResolve({ preferBuiltins: true }),
    json({ preferConst: true }),
    commonjs(),
  ],
  output: [
    {
      sourcemap: true,
      dir: 'dist/esm',
      format: 'esm',
      entryFileNames: '[name].js',
    },
    {
      sourcemap: true,
      dir: 'dist/cjs',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      interop: 'auto',
    },
  ],
}];
