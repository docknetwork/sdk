import json from 'rollup-plugin-json';
import pkg from './package.json';
import glob from 'glob';

export default async function() {
  const input = {};

  await new Promise((resolve, reject) => {
    const dir = 'src';
    glob(dir + '/**/*.js', null, (er, files) => {
      if (!er && files) {
        for (let i = 0; i < files.length; i++) {
          const fileName = files[i].substr(dir.length + 1);
          if (fileName.substr(fileName.length - 3) === '.js') {
            let id = fileName.substr(0, fileName.length - 3);
            if (id === 'api') {
              id = 'index';
            }
            input[id] = files[i];
          }
        }
        resolve(files);
      } else {
        throw new Error('Unable to list src files!');
      }
    });
  });

  return [{
    plugins: [
      json(),
    ],
    input,
    output: [
      // {
      //   dir: 'dist',
      //   format: 'esm',
      //   entryFileNames: '[name].mjs'
      // },
      {
        dir: 'dist',
        format: 'cjs'
      }
    ]
  }];
};
