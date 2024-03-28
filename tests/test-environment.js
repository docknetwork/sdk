const NodeEnvironment = require('jest-environment-node').TestEnvironment;

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
          Buffer
        },
      },
      context,
    );
  }

  async setup() {}

  async teardown() {}
}

module.exports = MyEnvironment;
