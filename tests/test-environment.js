const NodeEnvironment = require('jest-environment-node');

class MyEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(
      {
        ...config,
        globals: {
          ...config.globals,
          Uint32Array,
          Uint8Array,
          ArrayBuffer,
          TextDecoder,
          TextEncoder,
        },
      },
      context,
    );
  }

  async setup() {}

  async teardown() {}
}

module.exports = MyEnvironment;
