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
        },
      },
    },
  }
}));
