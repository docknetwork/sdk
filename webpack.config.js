const path = require('path');

module.exports = [
  'source-map'
].map(() => ({
  mode: 'production',
  entry: {
    dock: './src/api.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    // filename: '[name].[contenthash].min.js',
    filename: '[name].min.js',
    library: 'dock',
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 10000,
      cacheGroups: {
        polkadot: {
          test: /[\\/]node_modules[\\/]@polkadot[\\/]/,
          name: 'polkadot',
          // name(module) {
          //   // get the name. E.g. node_modules/packageName/not/this/part.js
          //   // or node_modules/packageName
          //   const packageName = module.context.match(/[\\/]node_modules[\\/]@polkadot[\\/](.*?)([\\/]|$)/)[1];
          //
          //   // npm package names are URL-safe, but some servers don't like @ symbols
          //   return `npm.${packageName.replace('@', '')}`;
          // },
        },
          // vendor: {
          //   test: /[\\/]node_modules[\\/]/,
          //   name: 'vendor'
          // },
      },
    },
  }


  // optimization: {
  //   // runtimeChunk: true,
  //   // usedExports: true,
  //   splitChunks: {
  //     chunks: 'all',
  //   }
  // }
}));
