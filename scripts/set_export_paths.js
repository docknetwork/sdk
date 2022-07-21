const distDir = 'dist';
const distPackage = 'package.json';

const { resolve, relative } = require('path');
const { readdir, readFile, writeFile } = require('fs').promises;

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    const relativePath = relative(resolve(process.cwd(), distDir), res);
    if (dirent.isDirectory()) {
      yield relativePath;
      yield* getFiles(res);
    } else {
      yield relativePath;
    }
  }
}

(async () => {
  const exports = {
    '.': {
      require: './index.cjs',
      default: './index.js',
    },
  };
  for await (const f of getFiles(distDir)) {
    if (f.indexOf('.cjs') > -1) {
      continue;
    }

    if (f.indexOf('.js') > -1) {
      exports[`./${f.substring(0, f.length - 3)}`] = {
        require: `./${f.substring(0, f.length - 3)}.cjs`,
        default: `./${f}`,
      };
    } else {
      exports[`./${f}`] = {
        require: `./${f}/index.cjs`,
        default: `./${f}/index.js`,
      };
    }
  }
  console.log(JSON.stringify(exports, null, 2));

  // Read package.json and modify it
  const packagePath = resolve(distDir, distPackage);
  const distPackageTxt = (await readFile(packagePath)).toString('UTF-8');
  const distPackageJSON = JSON.parse(distPackageTxt);
  distPackageJSON.exports = exports;
  distPackageJSON.type = 'module';
  await writeFile(packagePath, JSON.stringify(distPackageJSON, null, 2));
})();
